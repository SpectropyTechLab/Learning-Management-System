import * as studioDocuments from '../services/studioDocuments.service.js';
import { handleServiceError } from '../utils/errors.js';

const respond = (action) => async (req, res) => {
  try { return res.json({ data: await action(req) }); }
  catch (error) { return handleServiceError(res, error, 'Studio document request failed'); }
};

export const uploadSessionPlan = respond((req) => studioDocuments.uploadSessionPlan({ sessionId: Number(req.params.sessionId), file: req.file, user: req.user }));
export const uploadScreenScript = respond((req) => studioDocuments.uploadScreenScript({ screenId: Number(req.params.screenId), file: req.file, user: req.user }));
export const downloadSessionPlan = respond((req) => studioDocuments.downloadSessionPlan({ sessionId: Number(req.params.sessionId), user: req.user }));
export const downloadScreenScript = respond((req) => studioDocuments.downloadScreenScript({ screenId: Number(req.params.screenId), user: req.user }));
export const saveSessionPlanContent = respond((req) => studioDocuments.saveSessionPlanContent({ sessionId: Number(req.params.sessionId), content: req.body.content, user: req.user }));
export const saveScreenScriptContent = respond((req) => studioDocuments.saveScreenScriptContent({ screenId: Number(req.params.screenId), content: req.body.content, user: req.user }));
