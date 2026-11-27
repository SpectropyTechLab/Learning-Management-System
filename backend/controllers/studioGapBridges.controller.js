import * as gapBridges from '../services/studioGapBridges.service.js';
import { handleStudioServiceError } from '../utils/errors.js';

const respond = (action) => async (req, res) => {
  try {
    return res.json({ data: await action(req) });
  } catch (error) {
    return handleStudioServiceError(res, error, 'Gap Bridge request failed');
  }
};

export const listGapBridges = respond((req) => gapBridges.listGapBridges({ screenId: req.params.screenId, user: req.user }));
export const createExternalGapBridge = respond((req) => gapBridges.createExternalGapBridge({ screenId: req.params.screenId, body: req.body, user: req.user }));
export const createChildGapBridge = respond((req) => gapBridges.createChildGapBridge({ screenId: req.params.screenId, body: req.body, user: req.user }));
export const updateGapBridge = respond((req) => gapBridges.updateGapBridge({ gapBridgeId: req.params.gapBridgeId, body: req.body, user: req.user }));
export const deleteGapBridge = respond((req) => gapBridges.deleteGapBridge({ gapBridgeId: req.params.gapBridgeId, body: req.body, user: req.user }));
export const reorderGapBridges = respond((req) => gapBridges.reorderGapBridges({ screenId: req.params.screenId, body: req.body, user: req.user }));
export const moveChildGapBridge = respond((req) => gapBridges.moveChildGapBridge({ gapBridgeId: req.params.gapBridgeId, body: req.body, user: req.user }));
export const searchGapBridgeTargets = respond((req) => gapBridges.searchGapBridgeTargets({ query: req.query, user: req.user }));
