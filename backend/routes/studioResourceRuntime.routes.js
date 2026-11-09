import { Router } from 'express';
import {
  downloadResourceVersion,
  launchResourceVersion,
  previewResourceVersion,
  previewObjectResourceVersion,
  serveRuntimeAsset,
} from '../controllers/studioResourceRuntime.controller.js';
import { attachClientContext, authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const authorAccess = [
  authenticateToken,
  attachClientContext,
  requireRole(['super_admin', 'content_authorizer']),
];

// The runtime token is the authorization for package assets. It is short-lived
// and contains no LMS access token.
router.get('/studio/runtime/:launchToken/*', serveRuntimeAsset);

router.post('/studio/resource-versions/:versionId/launch', ...authorAccess, launchResourceVersion);
router.get('/studio/resource-versions/:versionId/download', ...authorAccess, downloadResourceVersion);
router.get('/studio/resource-versions/:versionId/preview', ...authorAccess, previewResourceVersion);
router.get('/studio/resource-versions/:versionId/object-preview', ...authorAccess, previewObjectResourceVersion);

export default router;
