import { Router } from 'express';
import { authenticateToken, attachClientContext, requireRole } from '../middleware/auth.js';
import {
  commitScormAttempt,
  getScormAttempt,
  navigateScormAttempt,
  startScormAttempt,
} from '../controllers/studioScormRuntime.controller.js';

const router = Router();
const runtimeReaders = requireRole(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher']);

router.use(authenticateToken, attachClientContext, runtimeReaders);
router.post('/studio/scorm/attempts', startScormAttempt);
router.get('/studio/scorm/attempts/:attemptId', getScormAttempt);
router.post('/studio/scorm/attempts/:attemptId/commit', commitScormAttempt);
router.post('/studio/scorm/attempts/:attemptId/navigate', navigateScormAttempt);

export default router;
