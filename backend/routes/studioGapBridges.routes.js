import { Router } from 'express';
import { authenticateToken, attachClientContext, requireRole } from '../middleware/auth.js';
import {
  createChildGapBridge,
  createExternalGapBridge,
  deleteGapBridge,
  listGapBridges,
  moveChildGapBridge,
  reorderGapBridges,
  searchGapBridgeTargets,
  updateGapBridge,
} from '../controllers/studioGapBridges.controller.js';

const router = Router();
const authors = requireRole(['super_admin', 'content_authorizer']);

router.use(authenticateToken, attachClientContext, authors);
router.get('/studio/gap-bridge-targets', searchGapBridgeTargets);
router.get('/studio/screens/:screenId/gap-bridges', listGapBridges);
router.post('/studio/screens/:screenId/gap-bridges/external', createExternalGapBridge);
router.post('/studio/screens/:screenId/gap-bridges/child', createChildGapBridge);
router.patch('/studio/screens/:screenId/gap-bridges/reorder', reorderGapBridges);
router.patch('/studio/gap-bridges/:gapBridgeId/move-child', moveChildGapBridge);
router.patch('/studio/gap-bridges/:gapBridgeId', updateGapBridge);
router.delete('/studio/gap-bridges/:gapBridgeId', deleteGapBridge);

export default router;
