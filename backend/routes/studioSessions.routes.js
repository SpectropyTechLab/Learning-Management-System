import { Router } from 'express';
import { authenticateToken, attachClientContext, requireRole } from '../middleware/auth.js';
import {
  createStudioSession,
  getStudioSession,
  listStudioSessions,
} from '../controllers/studioSessions.controller.js';

const router = Router();

router.use(authenticateToken, attachClientContext, requireRole(['super_admin', 'content_authorizer']));
router.get('/studio/subtopics/:subtopicId/sessions', listStudioSessions);
router.post('/studio/subtopics/:subtopicId/sessions', createStudioSession);
router.get('/studio/sessions/:sessionId', getStudioSession);

export default router;
