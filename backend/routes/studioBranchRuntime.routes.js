import { Router } from 'express';
import { authenticateToken, attachClientContext, requireRole } from '../middleware/auth.js';
import {
  abandonBranchRun,
  completeBranchRun,
  createBranchRun,
  enterBranch,
  getBranchRun,
  getBranchRunHistory,
  returnFromBranch,
  updateBranchState,
} from '../controllers/studioBranchRuntime.controller.js';

const router = Router();

router.use('/studio/branch-runs', authenticateToken, attachClientContext, requireRole(['teacher']));
router.post('/studio/branch-runs', createBranchRun);
router.post('/studio/branch-runs/:runId/enter', enterBranch);
router.patch('/studio/branch-runs/:runId/checkpoints/:checkpointId/state', updateBranchState);
router.post('/studio/branch-runs/:runId/return', returnFromBranch);
router.get('/studio/branch-runs/:runId/history', getBranchRunHistory);
router.get('/studio/branch-runs/:runId', getBranchRun);
router.post('/studio/branch-runs/:runId/complete', completeBranchRun);
router.post('/studio/branch-runs/:runId/abandon', abandonBranchRun);

export default router;
