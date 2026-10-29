import * as studioLayouts from '../services/studioLayouts.service.js';
import { handleServiceError } from '../utils/errors.js';

const respond = (action, successStatus = 200) => async (req, res) => {
  try {
    const data = await action(req);
    return res.status(successStatus).json({ data });
  } catch (error) {
    return handleServiceError(res, error, 'Studio layout request failed');
  }
};

export const listLayouts = respond((req) => studioLayouts.listLayouts({ user: req.user, query: req.query }));
export const getLayout = respond((req) => studioLayouts.getLayout({ layoutId: req.params.layoutId, user: req.user }));
export const createLayout = respond((req) => studioLayouts.createLayout({ body: req.body, user: req.user }), 201);
export const updateLayout = respond((req) => studioLayouts.updateLayout({ layoutId: req.params.layoutId, body: req.body, user: req.user }), 201);
export const createScreen = respond((req) => studioLayouts.createScreen({ sessionId: req.params.sessionId, body: req.body, user: req.user }), 201);
