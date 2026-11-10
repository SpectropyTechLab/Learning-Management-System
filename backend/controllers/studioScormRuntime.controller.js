import * as runtime from '../services/studioScormRuntime.service.js';
import { handleServiceError } from '../utils/errors.js';

const respond = (action, status = 200) => async (req, res) => {
  try {
    return res.status(status).json({ data: await action(req) });
  } catch (error) {
    return handleServiceError(res, error, 'Studio SCORM runtime request failed');
  }
};

export const startScormAttempt = respond((req) => runtime.startScormAttempt({
  versionId: req.body.resource_version_id,
  releaseId: req.body.release_id,
  resume: req.body.resume !== false,
  user: req.user,
}), 201);

export const getScormAttempt = respond((req) => runtime.getScormAttempt({
  attemptId: req.params.attemptId,
  user: req.user,
}));

export const commitScormAttempt = respond((req) => runtime.commitScormAttempt({
  attemptId: req.params.attemptId,
  scoIdentifier: req.body.sco_identifier,
  data: req.body.data,
  event: req.body.event,
  user: req.user,
}));

export const navigateScormAttempt = respond((req) => runtime.navigateScormAttempt({
  attemptId: req.params.attemptId,
  direction: req.body.direction,
  scoIdentifier: req.body.sco_identifier,
  user: req.user,
}));
