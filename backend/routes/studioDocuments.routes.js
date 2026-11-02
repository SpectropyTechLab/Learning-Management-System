import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, attachClientContext, requireRole } from '../middleware/auth.js';
import {
  uploadSessionPlan, uploadScreenScript, downloadSessionPlan, downloadScreenScript,
  saveSessionPlanContent, saveScreenScriptContent,
  listScreenScripts,
} from '../controllers/studioDocuments.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const readers = requireRole(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher']);
const authors = requireRole(['super_admin', 'content_authorizer']);

router.use(authenticateToken, attachClientContext, readers);
// Check the academic write role before Multer reads a potentially large body.
router.post('/studio/sessions/:sessionId/session-plan', authors, upload.single('file'), uploadSessionPlan);
router.put('/studio/sessions/:sessionId/session-plan', authors, upload.single('file'), uploadSessionPlan);
router.patch('/studio/sessions/:sessionId/session-plan/content', authors, saveSessionPlanContent);
router.get('/studio/sessions/:sessionId/session-plan/download', downloadSessionPlan);
router.post('/studio/sessions/:sessionId/screen-script', authors, upload.single('file'), uploadScreenScript);
router.put('/studio/sessions/:sessionId/screen-script', authors, upload.single('file'), uploadScreenScript);
router.patch('/studio/sessions/:sessionId/screen-script/content', authors, saveScreenScriptContent);
router.get('/studio/sessions/:sessionId/screen-script/download', downloadScreenScript);
router.get('/studio/sessions/:sessionId/screen-scripts', authors, listScreenScripts);

export default router;
