import * as screens from '../services/studioScreens.service.js';
import { handleServiceError } from '../utils/errors.js';

const respond = (action) => async (req, res) => {
  try {
    return res.json({ data: await action(req) });
  } catch (error) {
    return handleServiceError(res, error, 'Studio screen request failed');
  }
};

export const listSessionScreens = respond((req) => screens.listSessionScreens({ sessionId: req.params.sessionId, user: req.user }));
export const getScreen = respond((req) => screens.getScreen({ screenId: req.params.screenId, user: req.user }));
export const saveScreen = respond((req) => screens.saveScreen({ screenId: req.params.screenId, body: req.body, user: req.user }));
export const reorderScreens = respond((req) => screens.reorderScreens({ sessionId: req.params.sessionId, body: req.body, user: req.user }));
