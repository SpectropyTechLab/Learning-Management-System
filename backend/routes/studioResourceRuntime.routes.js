import { Router } from 'express';
import {
  downloadResourceVersion,
  launchResourceVersion,
  serveRuntimeAsset,
} from '../controllers/studioResourceRuntime.controller.js';
import { attachClientContext, authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// The runtime token is the authorization for package assets. It is short-lived
// and contains no LMS access token.
router.get('/studio/runtime/:launchToken/*', serveRuntimeAsset);

router.use(
  authenticateToken,
  attachClientContext,
  requireRole(['super_admin', 'content_authorizer'])
);
router.post('/studio/resource-versions/:versionId/launch', launchResourceVersion);
router.get('/studio/resource-versions/:versionId/download', downloadResourceVersion);

export default router;
