import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, attachClientContext, requireRole } from '../middleware/auth.js';
import {
  uploadSessionPlan, uploadScreenScript, downloadSessionPlan, downloadScreenScript,
  saveSessionPlanContent, saveScreenScriptContent, getSessionPlan, getScreenScriptSource,
  previewSessionPlanImport, importSessionPlan, previewScreenScriptImport,
  importScreenScripts, listScreenScripts, saveScreenScript,
  getCurriculumDocument, previewCurriculumDocument, uploadCurriculumDocument, downloadCurriculumDocument,
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
router.get('/studio/sessions/:sessionId/session-plan', getSessionPlan);
router.post('/studio/session-plan/import-preview', authors, upload.single('file'), previewSessionPlanImport);
router.post('/studio/sessions/:sessionId/session-plan/import', authors, upload.single('file'), importSessionPlan);
router.post('/studio/sessions/:sessionId/screen-script', authors, upload.single('file'), uploadScreenScript);
router.put('/studio/sessions/:sessionId/screen-script', authors, upload.single('file'), uploadScreenScript);
router.patch('/studio/sessions/:sessionId/screen-script/content', authors, saveScreenScriptContent);
router.get('/studio/sessions/:sessionId/screen-script/download', downloadScreenScript);
router.get('/studio/sessions/:sessionId/screen-script', getScreenScriptSource);
router.post('/studio/sessions/:sessionId/screen-scripts/import-preview', authors, upload.single('file'), previewScreenScriptImport);
router.post('/studio/sessions/:sessionId/screen-scripts/import', authors, upload.single('file'), importScreenScripts);
router.get('/studio/sessions/:sessionId/screen-scripts', listScreenScripts);
router.put('/studio/sessions/:sessionId/screens/:screenId/script', authors, saveScreenScript);
router.get('/studio/chapters/:chapterId/curriculum-document', getCurriculumDocument);
router.get('/studio/chapters/:chapterId/curriculum-document/preview', previewCurriculumDocument);
router.post('/studio/chapters/:chapterId/curriculum-document', authors, upload.single('file'), uploadCurriculumDocument);
router.put('/studio/chapters/:chapterId/curriculum-document', authors, upload.single('file'), uploadCurriculumDocument);
router.get('/studio/chapters/:chapterId/curriculum-document/download', downloadCurriculumDocument);

export default router;
