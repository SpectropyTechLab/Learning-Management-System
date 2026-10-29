import { Router } from 'express';
import { authenticateToken, attachClientContext, requireRole } from '../middleware/auth.js';
import {
  listSessionScreens, getScreen, saveScreen, reorderScreens,
} from '../controllers/studioScreens.controller.js';
import {
  discoverScreens, getBranchDestinations,
} from '../controllers/studioDiscovery.controller.js';

const router = Router();
const readers = requireRole(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher']);
const authors = requireRole(['super_admin', 'content_authorizer']);
const discoveryReaders = requireRole([
  'super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher',
]);

router.use(authenticateToken, attachClientContext, readers);
router.get('/studio/screens/discovery', discoveryReaders, discoverScreens);
router.get('/studio/screens/:screenId/branches', discoveryReaders, getBranchDestinations);
router.get('/studio/sessions/:sessionId/screens', listSessionScreens);
router.get('/studio/screens/:screenId', getScreen);
router.patch('/studio/screens/:screenId', authors, saveScreen);
router.patch('/studio/sessions/:sessionId/screens/reorder', authors, reorderScreens);

export default router;
