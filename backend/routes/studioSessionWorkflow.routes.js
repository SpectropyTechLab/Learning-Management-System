import { Router } from 'express';
import { authenticateToken, attachClientContext, requireRole } from '../middleware/auth.js';
import {
  submitSession,
  reviewSession,
  publishSession,
  getSessionStatus,
} from '../controllers/studioSessionWorkflow.controller.js';

const router = Router();

router.use(
  authenticateToken,
  attachClientContext,
  requireRole(['super_admin', 'content_authorizer'])
);

router.post('/studio/sessions/:sessionId/submit', submitSession);
router.post('/studio/sessions/:sessionId/review', reviewSession);
router.post('/studio/sessions/:sessionId/publish', publishSession);
router.get('/studio/sessions/:sessionId/status', getSessionStatus);

export default router;
