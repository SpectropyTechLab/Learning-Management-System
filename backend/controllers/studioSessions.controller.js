import * as sessions from '../services/studioSessions.service.js';
import { handleStudioServiceError } from '../utils/errors.js';

const respond = (action, status = 200) => async (req, res) => {
  try {
    return res.status(status).json({ data: await action(req) });
  } catch (error) {
    return handleStudioServiceError(res, error, 'Studio session request failed');
  }
};

export const listSubtopicSessions = respond((req) =>
  sessions.listSubtopicSessions({ subtopicId: req.params.subtopicId, user: req.user }));
export const listAllStudioSessions = respond((req) =>
  sessions.listAllStudioSessions({ status: req.query.status, user: req.user }));
export const getStudioSession = respond((req) =>
  sessions.getStudioSession({ sessionId: req.params.sessionId, user: req.user }));
export const createStudioSession = respond((req) =>
  sessions.createStudioSession({ subtopicId: req.params.subtopicId, body: req.body, user: req.user }), 201);
export const updateStudioSession = respond((req) =>
  sessions.updateStudioSession({ sessionId: req.params.sessionId, body: req.body, user: req.user }));
export const deleteStudioSession = respond((req) =>
  sessions.deleteStudioSession({ sessionId: req.params.sessionId, user: req.user }));
