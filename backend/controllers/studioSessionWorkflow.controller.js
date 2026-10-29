import * as workflow from '../services/studioSessionWorkflow.service.js';
import { handleServiceError } from '../utils/errors.js';

const handle = (action) => async (req, res) => {
  try {
    const data = await action(req);
    return res.json({ data });
  } catch (error) {
    if (error?.details) {
      return res.status(error.status || 422).json({ error: error.message, errors: error.details });
    }
    return handleServiceError(res, error, 'Studio Session workflow request failed');
  }
};

export const submitSession = handle((req) => workflow.submitSession({
  sessionId: req.params.sessionId,
  user: req.user,
}));

export const reviewSession = handle((req) => workflow.reviewSession({
  sessionId: req.params.sessionId,
  decision: req.body.decision,
  comment: req.body.comment,
  user: req.user,
}));

export const publishSession = handle((req) => workflow.publishSession({
  sessionId: req.params.sessionId,
  user: req.user,
}));

export const getSessionStatus = handle((req) => workflow.getSessionStatus({
  sessionId: req.params.sessionId,
  user: req.user,
}));
