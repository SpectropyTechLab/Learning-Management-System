import * as screens from '../services/studioScreens.service.js';
import { handleStudioServiceError } from '../utils/errors.js';

const respond = (action) => async (req, res) => {
  try {
    return res.json({ data: await action(req) });
  } catch (error) {
    return handleStudioServiceError(res, error, 'Studio screen request failed');
  }
};

export const listSessionScreens = respond((req) => screens.listSessionScreens({ sessionId: req.params.sessionId, user: req.user }));
export const getScreen = respond((req) => screens.getScreen({ screenId: req.params.screenId, user: req.user }));
export const saveScreen = respond((req) => screens.saveScreen({ screenId: req.params.screenId, body: req.body, user: req.user }));
export const deleteScreen = respond((req) => screens.deleteScreen({ screenId: req.params.screenId, user: req.user }));
export const reorderScreens = respond((req) => screens.reorderScreens({ sessionId: req.params.sessionId, body: req.body, user: req.user }));
export const listScreenSections = respond((req) => screens.listScreenSections({ sessionId: req.params.sessionId, user: req.user }));
export const createScreenSection = respond((req) => screens.saveScreenSection({ sessionId: req.params.sessionId, body: req.body, user: req.user }));
export const updateScreenSection = respond((req) => screens.saveScreenSection({ sessionId: req.body.session_id, sectionId: req.params.sectionId, body: req.body, user: req.user }));
export const deleteScreenSection = respond((req) => screens.deleteScreenSection({ sectionId: req.params.sectionId, user: req.user }));
