import * as runtime from '../services/studioBranchRuntime.service.js';
import { handleServiceError } from '../utils/errors.js';

const respond = (action, status = 200) => async (req, res) => {
  try {
    return res.status(status).json({ data: await action(req) });
  } catch (error) {
    if (error?.status && error?.code) {
      return res.status(error.status).json({
        error: { code: error.code, message: error.message },
      });
    }
    return handleServiceError(res, error, 'Studio branch runtime request failed');
  }
};

export const createBranchRun = respond((req) => runtime.createBranchRun({
  releaseId: req.body.release_id,
  sessionId: req.body.session_id,
  screenId: req.body.screen_id,
  user: req.user,
}), 201);

export const enterBranch = respond((req) => runtime.enterBranch({
  runId: req.params.runId,
  branchId: req.body.branch_id,
  branchKey: req.body.branch_key,
  origin: req.body.origin,
  user: req.user,
}), 201);

export const updateBranchState = respond((req) => runtime.updateBranchState({
  runId: req.params.runId,
  checkpointId: req.params.checkpointId,
  state: req.body,
  user: req.user,
}));

export const returnFromBranch = respond((req) => runtime.returnFromBranch({
  runId: req.params.runId,
  user: req.user,
}));

export const getBranchRun = respond((req) => runtime.getBranchRun({
  runId: req.params.runId,
  user: req.user,
}));

export const completeBranchRun = respond((req) => runtime.completeBranchRun({
  runId: req.params.runId,
  user: req.user,
}));

export const abandonBranchRun = respond((req) => runtime.abandonBranchRun({
  runId: req.params.runId,
  user: req.user,
}));

export const getBranchRunHistory = respond((req) => runtime.getBranchRunHistory({
  runId: req.params.runId,
  user: req.user,
}));
