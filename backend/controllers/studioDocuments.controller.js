import * as studioDocuments from '../services/studioDocuments.service.js';
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
