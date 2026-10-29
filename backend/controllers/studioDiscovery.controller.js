import * as discovery from '../services/studioDiscovery.service.js';
import { handleServiceError } from '../utils/errors.js';

const respond = (action) => async (req, res) => {
  try {
    return res.json({ data: await action(req) });
  } catch (error) {
    return handleServiceError(res, error, 'Studio discovery request failed');
  }
};

export const discoverScreens = respond((req) => discovery.discoverScreens({
  tags: req.query.tags,
  sessionId: req.query.session_id,
  user: req.user,
}));

export const getBranchDestinations = respond((req) => discovery.getBranchDestinations({
  screenId: req.params.screenId,
  releaseId: req.query.release_id,
  user: req.user,
}));

