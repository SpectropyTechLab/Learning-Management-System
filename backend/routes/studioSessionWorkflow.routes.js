import { Router } from 'express';
import { authenticateToken, attachClientContext, requireRole } from '../middleware/auth.js';
import {
  submitSession,
  reviewSession,
  publishSession,
  getSessionStatus,
  startSessionRevision,
} from '../controllers/studioSessionWorkflow.controller.js';

const router = Router();
const authorAccess = [
  authenticateToken,
  attachClientContext,
  requireRole(['super_admin', 'content_authorizer']),
];

// Apply author access to each workflow endpoint instead of every request that
// passes through this /api-mounted router. This lets unrelated reader routes
// continue to their own role checks.
router.post('/studio/sessions/:sessionId/submit', ...authorAccess, submitSession);
router.post('/studio/sessions/:sessionId/review', ...authorAccess, reviewSession);
router.post('/studio/sessions/:sessionId/publish', ...authorAccess, publishSession);
router.get('/studio/sessions/:sessionId/status', ...authorAccess, getSessionStatus);
router.post('/studio/sessions/:sessionId/revise', ...authorAccess, startSessionRevision);

export default router;
