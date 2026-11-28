import path from 'node:path';
import AdmZip from 'adm-zip';
import supabase from '../config/supabaseClient.js';
import { query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';
import { replacePptxSlideTransitionXml } from './studioPptxTransitionCodec.service.js';

const BUCKET = process.env.STUDIO_RESOURCES_BUCKET || 'studio-resources';
const AUTHOR_ROLES = new Set(['super_admin', 'content_authorizer']);

const parseId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`${label} must be a positive integer`, 400, 'INVALID_ID');
  return id;
};

const canAccessTenant = (clientId, user) => user?.role === 'super_admin'
  || (user?.role === 'content_authorizer' && !user?.client_id)
  || (user?.client_id != null && Number(user.client_id) === Number(clientId));

const safeFileName = (value) => {
  const base = path.basename(String(value || 'presentation.pptx')).replace(/[^a-zA-Z0-9._ -]+/g, '_');
  return /\.pptx$/i.test(base) ? base : `${base}.pptx`;
};

const escapeXml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const extensionFor = (fileName, mimeType) => {
  const supplied = path.extname(String(fileName || '')).replace(/^\./, '').toLowerCase();
  if (supplied) return supplied;
  return ({ 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/wav': 'wav', 'audio/ogg': 'ogg' })[mimeType] || 'mp3';
};

const addContentTypeDefault = (zip, extension, mimeType) => {
  const entry = zip.getEntry('[Content_Types].xml');
  if (!entry) return;
  let xml = entry.getData().toString('utf8');
  const escapedExtension = extension.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`<Default\\b[^>]*Extension=["']${escapedExtension}["']`, 'i').test(xml)) return;
  xml = xml.replace(/<\/Types>/i, `<Default Extension="${escapeXml(extension)}" ContentType="${escapeXml(mimeType)}"/></Types>`);
  zip.updateFile('[Content_Types].xml', Buffer.from(xml, 'utf8'));
};

const addSlideAudioRelationship = (zip, slidePart, target) => {
  const fileName = path.posix.basename(slidePart);
  const relsPart = `${path.posix.dirname(slidePart)}/_rels/${fileName}.rels`;
  const relsEntry = zip.getEntry(relsPart);
  let xml = relsEntry
    ? relsEntry.getData().toString('utf8')
    : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const used = [...xml.matchAll(/\bId=["']rId(\d+)["']/gi)].map((match) => Number(match[1]));
  const relationshipId = `rId${Math.max(0, ...used) + 1}`;
  const relationship = `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio" Target="${escapeXml(target)}"/>`;
  xml = xml.replace(/<\/Relationships>/i, `${relationship}</Relationships>`);
  if (relsEntry) zip.updateFile(relsPart, Buffer.from(xml, 'utf8'));
  else zip.addFile(relsPart, Buffer.from(xml, 'utf8'));
  return relationshipId;
};

export const exportImportedSessionPptx = async ({
  sessionId: rawSessionId,
  user,
  db = { query: dbQuery },
  storage = supabase.storage.from(BUCKET),
}) => {
  if (!AUTHOR_ROLES.has(user?.role)) throw new AppError('Only Content Authorizers can export Studio presentations', 403, 'AUTHOR_ROLE_REQUIRED');
  const sessionId = parseId(rawSessionId, 'Session ID');
  const sessionResult = await db.query('SELECT id, client_id, title FROM sessions WHERE id = $1', [sessionId]);
  const session = sessionResult.rows[0];
  if (!session || !canAccessTenant(session.client_id, user)) throw new AppError('Studio session not found', 404, 'SESSION_NOT_FOUND');

  const screenResult = await db.query(
    `SELECT id, title, screen_settings_json
       FROM screens
      WHERE session_id = $1
      ORDER BY display_order, screen_number, id`,
    [sessionId],
  );
  if (!screenResult.rows.length) throw new AppError('This session has no Screens to export', 409, 'PPTX_EXPORT_EMPTY_SESSION');

  const sources = screenResult.rows.map((screen) => screen.screen_settings_json?.import?.source_resource || null);
  const sourceScreenIds = screenResult.rows.map((screen) => String(screen.screen_settings_json?.import?.source_screen_id || ''));
  if (sources.some((source) => !source?.resource_id || !source?.resource_version_id) || sourceScreenIds.some((value) => !value)) {
    throw new AppError(
      'Exact PowerPoint export is available for sessions whose Screens were imported from one retained .pptx file',
      409,
      'PPTX_EXPORT_SOURCE_REQUIRED',
    );
  }
  const resourceId = Number(sources[0].resource_id);
  const resourceVersionId = Number(sources[0].resource_version_id);
  if (sources.some((source) => Number(source.resource_id) !== resourceId || Number(source.resource_version_id) !== resourceVersionId)) {
    throw new AppError('This session combines Screens from different PowerPoint files and cannot be round-tripped as one deck', 409, 'PPTX_EXPORT_MIXED_SOURCES');
  }

  const versionResult = await db.query(
    `SELECT r.client_id, r.resource_type, rv.storage_key, rv.original_file_name, rv.mime_type
       FROM resources r
       JOIN resource_versions rv ON rv.resource_id = r.id
      WHERE r.id = $1 AND rv.id = $2`,
    [resourceId, resourceVersionId],
  );
  const version = versionResult.rows[0];
  if (!version || !canAccessTenant(version.client_id, user) || version.resource_type !== 'presentation' || !version.storage_key) {
    throw new AppError('The retained source PowerPoint file is unavailable', 409, 'PPTX_EXPORT_SOURCE_UNAVAILABLE');
  }

  const { data, error } = await storage.download(version.storage_key);
  if (error || !data) throw new AppError('The retained source PowerPoint file could not be downloaded', 502, 'PPTX_EXPORT_SOURCE_DOWNLOAD_FAILED');
  const zip = new AdmZip(Buffer.from(await data.arrayBuffer()));

  const customVersionIds = [...new Set(screenResult.rows
    .map((screen) => Number(screen.screen_settings_json?.transition?.customSound?.resourceVersionId))
    .filter((id) => Number.isInteger(id) && id > 0))];
  const customAudioByVersion = new Map();
  if (customVersionIds.length) {
    const audioResult = await db.query(
      `SELECT rv.id, rv.storage_key, rv.original_file_name, rv.mime_type, r.client_id
         FROM resource_versions rv
         JOIN resources r ON r.id = rv.resource_id
        WHERE rv.id = ANY($1::int[]) AND r.resource_type = 'audio'`,
      [customVersionIds],
    );
    for (const audio of audioResult.rows) {
      if (!canAccessTenant(audio.client_id, user) || !audio.storage_key) continue;
      const downloaded = await storage.download(audio.storage_key);
      if (downloaded.error || !downloaded.data) throw new AppError('A custom transition sound could not be downloaded', 502, 'PPTX_EXPORT_SOUND_DOWNLOAD_FAILED');
      customAudioByVersion.set(Number(audio.id), { ...audio, buffer: Buffer.from(await downloaded.data.arrayBuffer()) });
    }
    if (customAudioByVersion.size !== customVersionIds.length) {
      throw new AppError('A custom transition sound is unavailable for PowerPoint export', 409, 'PPTX_EXPORT_SOUND_UNAVAILABLE');
    }
  }

  for (let index = 0; index < screenResult.rows.length; index += 1) {
    const screen = screenResult.rows[index];
    const slidePart = sourceScreenIds[index].replace(/^\/+/, '');
    const entry = zip.getEntry(slidePart);
    if (!entry) throw new AppError(`Source slide ${slidePart} is missing from the retained PowerPoint file`, 409, 'PPTX_EXPORT_SLIDE_MISSING');
    const settings = screen.screen_settings_json || {};
    const transition = settings.transition || { effect: 'none' };
    let customSoundXml = '';
    const customVersionId = Number(transition.customSound?.resourceVersionId);
    if (transition.sound === 'custom' && customAudioByVersion.has(customVersionId)) {
      const audio = customAudioByVersion.get(customVersionId);
      const extension = extensionFor(audio.original_file_name, audio.mime_type);
      const mediaName = `spectropy-transition-${customVersionId}.${extension}`;
      const mediaPart = `ppt/media/${mediaName}`;
      if (!zip.getEntry(mediaPart)) zip.addFile(mediaPart, audio.buffer);
      addContentTypeDefault(zip, extension, audio.mime_type || 'audio/mpeg');
      const relationshipId = addSlideAudioRelationship(zip, slidePart, `../media/${mediaName}`);
      customSoundXml = `<p:sndAc><p:stSnd${transition.loopSound === true ? ' loop="1"' : ''}><p:snd r:embed="${relationshipId}" name="${escapeXml(transition.customSound?.name || audio.original_file_name || 'Transition sound')}"/></p:stSnd></p:sndAc>`;
    }
    const updatedXml = replacePptxSlideTransitionXml(entry.getData().toString('utf8'), transition, Boolean(settings.hidden), customSoundXml);
    zip.updateFile(slidePart, Buffer.from(updatedXml, 'utf8'));
  }

  return {
    buffer: zip.toBuffer(),
    fileName: safeFileName(version.original_file_name || `${session.title || 'presentation'}.pptx`),
  };
};
