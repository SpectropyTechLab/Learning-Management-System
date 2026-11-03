import * as studioDocuments from '../services/studioDocuments.service.js';
import * as curriculumDocuments from '../services/studioCurriculumDocuments.service.js';
import { handleServiceError } from '../utils/errors.js';

const respond = (action) => async (req, res) => {
  try { return res.json({ data: await action(req) }); }
  catch (error) { return handleServiceError(res, error, 'Studio document request failed'); }
};

const asciiFileName = (value) => String(value || 'document').replace(/[^\x20-\x7E]|["\\]/g, '_');
const download = (action) => async (req, res) => {
  try {
    const result = await action(req);
    const encodedName = encodeURIComponent(result.fileName);
    res.setHeader('Content-Type', result.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', String(result.sizeBytes));
    res.setHeader('Content-Disposition', `attachment; filename="${asciiFileName(result.fileName)}"; filename*=UTF-8''${encodedName}`);
    res.setHeader('X-Content-SHA256', result.sha256);
    res.setHeader('X-Studio-Document-Revision', String(result.revisionNo));
    return res.send(result.bytes);
  } catch (error) {
    return handleServiceError(res, error, 'Studio document download failed');
  }
};

export const uploadSessionPlan = respond((req) => studioDocuments.uploadSessionPlan({ sessionId: Number(req.params.sessionId), file: req.file, user: req.user }));
export const uploadScreenScript = respond((req) => studioDocuments.uploadScreenScript({ sessionId: Number(req.params.sessionId), file: req.file, user: req.user }));
export const downloadSessionPlan = download((req) => studioDocuments.downloadSessionPlan({ sessionId: Number(req.params.sessionId), user: req.user }));
export const downloadScreenScript = download((req) => studioDocuments.downloadScreenScript({ sessionId: Number(req.params.sessionId), user: req.user }));
export const saveSessionPlanContent = respond((req) => studioDocuments.saveSessionPlanContent({ sessionId: Number(req.params.sessionId), content: req.body.content, user: req.user }));
export const saveScreenScriptContent = respond((req) => studioDocuments.saveScreenScriptContent({ sessionId: Number(req.params.sessionId), content: req.body.content, user: req.user }));
export const getSessionPlan = respond((req) => studioDocuments.getDocument({ sessionId: Number(req.params.sessionId), documentType: 'session_plan', user: req.user }));
export const getScreenScriptSource = respond((req) => studioDocuments.getDocument({ sessionId: Number(req.params.sessionId), documentType: 'screen_script', user: req.user }));
export const previewSessionPlanImport = respond((req) => studioDocuments.previewSessionPlanImport({ file: req.file, user: req.user }));
export const importSessionPlan = respond((req) => studioDocuments.importSessionPlan({
  sessionId: Number(req.params.sessionId), file: req.file,
  content: JSON.parse(req.body.content || '{}'), user: req.user,
}));
export const previewScreenScriptImport = respond((req) => studioDocuments.previewScreenScriptImport({ sessionId: Number(req.params.sessionId), file: req.file, user: req.user }));
export const importScreenScripts = respond((req) => studioDocuments.importScreenScripts({
  sessionId: Number(req.params.sessionId), file: req.file,
  mappings: JSON.parse(req.body.mappings || '[]'), user: req.user,
}));
export const listScreenScripts = respond((req) => studioDocuments.listScreenScripts({ sessionId: Number(req.params.sessionId), user: req.user }));
export const saveScreenScript = respond((req) => studioDocuments.saveScreenScript({
  sessionId: Number(req.params.sessionId), screenId: Number(req.params.screenId),
  content: req.body.content, user: req.user,
}));
export const getCurriculumDocument = respond((req) => curriculumDocuments.getCurriculumDocument({ chapterId: Number(req.params.chapterId), user: req.user }));
export const uploadCurriculumDocument = respond((req) => curriculumDocuments.uploadCurriculumDocument({ chapterId: Number(req.params.chapterId), file: req.file, user: req.user }));
export const downloadCurriculumDocument = download((req) => curriculumDocuments.downloadCurriculumDocument({ chapterId: Number(req.params.chapterId), user: req.user }));
