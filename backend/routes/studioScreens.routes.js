import { Router } from 'express';
import { authenticateToken, attachClientContext, requireRole } from '../middleware/auth.js';
import {
  listSessionScreens, getScreen, saveScreen, deleteScreen, reorderScreens,
  listScreenSections, createScreenSection, updateScreenSection, deleteScreenSection,
} from '../controllers/studioScreens.controller.js';
import {
  discoverPublishedContent, discoverScreens, getBranchDestinations,
} from '../controllers/studioDiscovery.controller.js';

const router = Router();
const readers = requireRole(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher']);
const authors = requireRole(['super_admin', 'content_authorizer']);
const discoveryReaders = requireRole([
  'super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher',
]);

router.use(authenticateToken, attachClientContext, readers);
router.get('/studio/discovery', discoveryReaders, discoverPublishedContent);
router.get('/studio/screens/discovery', discoveryReaders, discoverScreens);
router.get('/studio/screens/:screenId/branches', discoveryReaders, getBranchDestinations);
router.get('/studio/sessions/:sessionId/screens', listSessionScreens);
router.get('/studio/screens/:screenId', getScreen);
router.patch('/studio/screens/:screenId', authors, saveScreen);
router.delete('/studio/screens/:screenId', authors, deleteScreen);
router.patch('/studio/sessions/:sessionId/screens/reorder', authors, reorderScreens);
router.get('/studio/sessions/:sessionId/sections', listScreenSections);
router.post('/studio/sessions/:sessionId/sections', authors, createScreenSection);
router.patch('/studio/sections/:sectionId', authors, updateScreenSection);
router.delete('/studio/sections/:sectionId', authors, deleteScreenSection);

export default router;
