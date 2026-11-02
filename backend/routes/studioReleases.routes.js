import { Router } from 'express';
import { authenticateToken, attachClientContext, requireRole } from '../middleware/auth.js';
import {
  getCurrentTeacherRelease,
  getTeacherReleaseByNumber,
  listTeacherReleases,
  listPublishedChapters,
  publishSessionRelease,
} from '../controllers/studioReleases.controller.js';

const router = Router();

router.use(authenticateToken, attachClientContext);

router.get(
  '/studio/published-chapters',
  requireRole(['super_admin', 'content_authorizer']),
  listPublishedChapters
);

router.post(
  '/studio/sessions/:sessionId/publish',
  requireRole(['super_admin', 'content_authorizer']),
  publishSessionRelease
);

// REST alias retained for clients that model publication as release creation.
router.post(
  '/studio/sessions/:sessionId/releases',
  requireRole(['super_admin', 'content_authorizer']),
  publishSessionRelease
);

router.get(
  '/studio/teacher/sessions/:sessionId/releases/current',
  requireRole(['teacher']),
  getCurrentTeacherRelease
);
router.get(
  '/studio/teacher/sessions/:sessionId/releases',
  requireRole(['teacher']),
  listTeacherReleases
);
router.get(
  '/studio/teacher/sessions/:sessionId/releases/:releaseNumber',
  requireRole(['teacher']),
  getTeacherReleaseByNumber
);

export default router;
