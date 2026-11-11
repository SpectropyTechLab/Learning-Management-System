import { Router } from 'express';
import {
  attachClientContext,
  authenticateToken,
  checkPermission,
  loadPermissions,
  requireRole,
} from '../middleware/auth.js';
import {
  createStudioSession,
  deleteStudioSession,
  getStudioSession,
  listAllStudioSessions,
  listSubtopicSessions,
  updateStudioSession,
} from '../controllers/studioSessions.controller.js';

const router = Router();
const readers = requireRole(['super_admin', 'content_authorizer']);
const authors = requireRole(['super_admin', 'content_authorizer']);

// These checks execute for direct API requests. Frontend navigation visibility
// is only a convenience and is never the authorization boundary.
router.use(authenticateToken, attachClientContext, readers, loadPermissions);
router.get('/studio/sessions', checkPermission('curriculum.read'), listAllStudioSessions);
router.get('/studio/subtopics/:subtopicId/sessions', checkPermission('curriculum.read'), listSubtopicSessions);
router.post('/studio/subtopics/:subtopicId/sessions', authors, checkPermission('curriculum.create'), createStudioSession);
router.get('/studio/sessions/:sessionId', checkPermission('curriculum.read'), getStudioSession);
router.patch('/studio/sessions/:sessionId', authors, checkPermission('curriculum.update'), updateStudioSession);
router.delete('/studio/sessions/:sessionId', authors, checkPermission('curriculum.delete'), deleteStudioSession);

export default router;
