import { Router } from 'express';
import { authenticateToken, attachClientContext, requireRole } from '../middleware/auth.js';
import {
  getCurrentTeacherRelease,
  getCurrentPublishedRelease,
  getPublishedReleaseByNumber,
  getTeacherReleaseByNumber,
  getPublishedTeachingMaterials,
  downloadPublishedSessionPlan,
  launchPublishedResource,
  listPublishedSessions,
  listPublishedSessionReleases,
  listTeacherReleases,
  listPublishedChapters,
  previewPublishedResource,
  publishSessionRelease,
} from '../controllers/studioReleases.controller.js';

const router = Router();

router.use(authenticateToken, attachClientContext);

router.get(
  '/studio/published-chapters',
  requireRole(['super_admin', 'content_authorizer']),
  listPublishedChapters
);

const publishedReaders = requireRole([
  'super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher',
]);

router.get('/studio/published-sessions', publishedReaders, listPublishedSessions);
router.get(
  '/studio/published-sessions/:sessionId/releases/current',
  publishedReaders,
  getCurrentPublishedRelease
);
router.get(
  '/studio/published-sessions/:sessionId/releases',
  publishedReaders,
  listPublishedSessionReleases
);
router.get(
  '/studio/published-sessions/:sessionId/releases/:releaseNumber',
  publishedReaders,
  getPublishedReleaseByNumber
);
router.post(
  '/studio/published-releases/:releaseId/resource-versions/:versionId/launch',
  publishedReaders,
  launchPublishedResource
);
router.get(
  '/studio/published-releases/:releaseId/resource-versions/:versionId/preview',
  publishedReaders,
  previewPublishedResource
);
router.get(
  '/studio/published-releases/:releaseId/teaching-materials',
  publishedReaders,
  getPublishedTeachingMaterials,
);
router.get(
  '/studio/published-releases/:releaseId/session-plan/download',
  publishedReaders,
  downloadPublishedSessionPlan,
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
