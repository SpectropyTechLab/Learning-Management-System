import { createHash, randomUUID } from 'node:crypto';
import mammoth from 'mammoth';
import sanitizeHtml from 'sanitize-html';
import supabase from '../config/supabaseClient.js';
import { getClient, query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';

const BUCKET = process.env.STUDIO_DOCUMENTS_BUCKET || 'sessions-scripts-plans';
const AUTHOR_ROLES = new Set(['super_admin', 'content_authorizer']);
const READER_ROLES = new Set(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher']);
const DOCX_STYLE_MAP = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => p.document-subtitle:fresh",
  "p[style-name='Heading 1'] => h2:fresh",
  "p[style-name='Heading 2'] => h3:fresh",
  "p[style-name='Heading 3'] => h4:fresh",
];

const sanitizeDocumentHtml = (html) => sanitizeHtml(html, {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u',
    's', 'sup', 'sub', 'blockquote', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot',
    'tr', 'th', 'td', 'caption', 'a', 'img', 'div', 'span',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
    p: ['class'],
  },
  allowedClasses: { p: ['document-subtitle'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowProtocolRelative: false,
  transformTags: {
    a: (_tagName, attribs) => ({
      tagName: 'a',
      attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' },
    }),
  },
});

export const convertCurriculumDocxPreview = async (buffer) => {
  const [converted, extracted] = await Promise.all([
    mammoth.convertToHtml(
      { buffer },
      {
        styleMap: DOCX_STYLE_MAP,
        includeDefaultStyleMap: true,
        convertImage: mammoth.images.imgElement(async (image) => ({
          src: `data:${image.contentType};base64,${await image.read('base64')}`,
        })),
      },
    ),
    mammoth.extractRawText({ buffer }),
  ]);
  return {
    html: sanitizeDocumentHtml(converted.value).trim(),
    text: extracted.value.replace(/\r/g, '').trim(),
    warnings: [...converted.messages, ...extracted.messages]
      .map((message) => String(message.message || message))
      .filter((message, index, messages) => messages.indexOf(message) === index),
  };
};

const parseId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`${label} must be a positive integer`);
  return id;
};
const safeName = (value) => String(value || 'curriculum.docx').replace(/[^a-zA-Z0-9._-]+/g, '_');
const assertAuthor = (user) => {
  if (!AUTHOR_ROLES.has(user?.role)) throw new AppError('Only Content Authorizers can change Curriculum documents', 403);
};

const loadChapter = async (db, chapterId, { lock = false } = {}) => {
  const result = await db.query(
    `SELECT ch.id, p.id AS program_id, p.client_id, p.school_id
     FROM chapters ch
     JOIN subjects su ON su.id = ch.subject_id
     JOIN grades g ON g.id = su.grade_id
     JOIN programs p ON p.id = g.program_id
     WHERE ch.id = $1 ${lock ? 'FOR UPDATE OF ch' : ''}`,
    [chapterId],
  );
  if (!result.rows[0]) throw new AppError('Chapter not found', 404);
  return result.rows[0];
};

const assertAccess = (chapter, user, { write = false } = {}) => {
  if (write) assertAuthor(user);
  else if (!READER_ROLES.has(user?.role)) throw new AppError('Access denied', 403);
  if (user?.role === 'super_admin' || (user?.role === 'content_authorizer' && !user?.client_id)) return;
  if (chapter.client_id !== null && Number(chapter.client_id) === Number(user?.client_id)) return;
  throw new AppError('Access denied', 403);
};

const currentDocument = async (db, chapterId, { lock = false } = {}) => (await db.query(
  `SELECT id, chapter_id, revision_no, storage_key, original_file_name,
          content_type, size_bytes, content_sha256, metadata_json,
          is_current, created_by, created_at
   FROM chapter_curriculum_documents
   WHERE chapter_id = $1 AND is_current = TRUE ${lock ? 'FOR UPDATE' : ''}`,
  [chapterId],
)).rows[0] || null;

export const getCurriculumDocument = async ({ chapterId: rawChapterId, user }) => {
  const chapterId = parseId(rawChapterId, 'Chapter ID');
  const chapter = await loadChapter({ query: dbQuery }, chapterId);
  assertAccess(chapter, user);
  return currentDocument({ query: dbQuery }, chapterId);
};

export const uploadCurriculumDocument = async ({ chapterId: rawChapterId, file, user }) => {
  const chapterId = parseId(rawChapterId, 'Chapter ID');
  assertAuthor(user);
  if (!file?.buffer?.length) throw new AppError('A non-empty Curriculum document is required');
  const storageKey = `curriculum/chapters/${chapterId}/${randomUUID()}-${safeName(file.originalname)}`;
  const contentType = file.mimetype || 'application/octet-stream';
  const { error } = await supabase.storage.from(BUCKET).upload(storageKey, file.buffer, { contentType, upsert: false });
  if (error) throw new AppError(`Unable to upload Curriculum document: ${error.message}`, 502);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const chapter = await loadChapter(client, chapterId, { lock: true });
    assertAccess(chapter, user, { write: true });
    const current = await currentDocument(client, chapterId, { lock: true });
    if (current) await client.query('UPDATE chapter_curriculum_documents SET is_current = FALSE WHERE id = $1', [current.id]);
    const revision = await client.query(
      'SELECT COALESCE(MAX(revision_no), 0) + 1 AS revision_no FROM chapter_curriculum_documents WHERE chapter_id = $1',
      [chapterId],
    );
    const result = await client.query(
      `INSERT INTO chapter_curriculum_documents (
         chapter_id, revision_no, storage_key, original_file_name, content_type,
         size_bytes, content_sha256, metadata_json, is_current, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, TRUE, $9)
       RETURNING id, chapter_id, revision_no, original_file_name, content_type,
                 size_bytes, content_sha256, metadata_json, is_current, created_by, created_at`,
      [chapterId, Number(revision.rows[0].revision_no), storageKey,
        String(file.originalname || 'curriculum-document'), contentType, file.buffer.length,
        createHash('sha256').update(file.buffer).digest('hex'),
        JSON.stringify({ hierarchy_level: 'chapter' }), user.id || null],
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (dbError) {
    await client.query('ROLLBACK');
    await supabase.storage.from(BUCKET).remove([storageKey]);
    throw dbError;
  } finally {
    client.release();
  }
};

export const downloadCurriculumDocument = async ({ chapterId: rawChapterId, user }) => {
  const chapterId = parseId(rawChapterId, 'Chapter ID');
  const chapter = await loadChapter({ query: dbQuery }, chapterId);
  assertAccess(chapter, user);
  const document = await currentDocument({ query: dbQuery }, chapterId);
  if (!document) throw new AppError('No Curriculum document is available for this Chapter', 404);
  const { data, error } = await supabase.storage.from(BUCKET).download(document.storage_key);
  if (error || !data) throw new AppError('Unable to download the Curriculum document', 502);
  const bytes = Buffer.from(await data.arrayBuffer());
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== Number(document.size_bytes) || sha256 !== document.content_sha256) {
    throw new AppError('Stored Curriculum document failed integrity verification', 502);
  }
  return {
    bytes,
    fileName: document.original_file_name,
    contentType: document.content_type,
    sizeBytes: bytes.length,
    sha256,
    revisionNo: document.revision_no,
  };
};

export const previewCurriculumDocument = async ({ chapterId: rawChapterId, user }) => {
  const downloaded = await downloadCurriculumDocument({ chapterId: rawChapterId, user });
  const fileName = String(downloaded.fileName || '').toLowerCase();
  const contentType = String(downloaded.contentType || '').toLowerCase();
  if (!fileName.endsWith('.docx') && !contentType.includes('wordprocessingml')) {
    throw new AppError('Inline Curriculum preview currently supports DOCX files; download this original to view it in its native application', 415);
  }
  try {
    const converted = await convertCurriculumDocxPreview(downloaded.bytes);
    return {
      file_name: downloaded.fileName,
      revision_no: downloaded.revisionNo,
      ...converted,
    };
  } catch (error) {
    throw new AppError(`Unable to preview the Curriculum DOCX: ${error.message}`, 422);
  }
};
