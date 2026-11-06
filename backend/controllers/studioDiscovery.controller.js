import * as discovery from '../services/studioDiscovery.service.js';
import { handleStudioServiceError } from '../utils/errors.js';

const respond = (action) => async (req, res) => {
  try {
    return res.json({ data: await action(req) });
  } catch (error) {
    return handleStudioServiceError(res, error, 'Studio discovery request failed');
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

export const discoverPublishedContent = respond((req) => discovery.discoverPublishedContent({
  releaseId: req.query.release_id,
  screenId: req.query.screen_id,
  type: req.query.type,
  topicId: req.query.topic_id,
  subtopicId: req.query.subtopic_id,
  tags: req.query.tags,
  pedagogy: req.query.pedagogy,
  bloom: req.query.bloom,
  search: req.query.search,
  limit: req.query.limit,
  cursor: req.query.cursor,
  user: req.user,
}));

