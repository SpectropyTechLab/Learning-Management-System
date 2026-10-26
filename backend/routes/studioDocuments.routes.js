import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, attachClientContext } from '../middleware/auth.js';
import {
  uploadSessionPlan, uploadScreenScript, downloadSessionPlan, downloadScreenScript,
  saveSessionPlanContent, saveScreenScriptContent,
} from '../controllers/studioDocuments.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.use(authenticateToken, attachClientContext);
router.post('/studio/sessions/:sessionId/session-plan', upload.single('file'), uploadSessionPlan);
router.put('/studio/sessions/:sessionId/session-plan', upload.single('file'), uploadSessionPlan);
router.patch('/studio/sessions/:sessionId/session-plan/content', saveSessionPlanContent);
router.get('/studio/sessions/:sessionId/session-plan/download', downloadSessionPlan);
router.post('/studio/screens/:screenId/screen-script', upload.single('file'), uploadScreenScript);
router.put('/studio/screens/:screenId/screen-script', upload.single('file'), uploadScreenScript);
router.patch('/studio/screens/:screenId/screen-script/content', saveScreenScriptContent);
router.get('/studio/screens/:screenId/screen-script/download', downloadScreenScript);

export default router;
