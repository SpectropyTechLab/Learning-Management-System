import * as resources from '../services/studioResources.service.js';
import * as teachingHub from '../services/studioTeachingResources.service.js';
import { handleStudioServiceError } from '../utils/errors.js';

const respond = (action, status = 200) => async (req, res) => {
  try {
    return res.status(status).json({ data: await action(req) });
  } catch (error) {
    return handleStudioServiceError(res, error, 'Studio resource request failed');
  }
};

export const listResources = respond((req) => resources.listResources({ query: req.query, user: req.user }));
export const getResource = respond((req) => resources.getResource({ resourceId: req.params.resourceId, user: req.user }));
export const renameResource = respond((req) => resources.renameResource({ resourceId: req.params.resourceId, body: req.body, user: req.user }));
export const createResource = respond((req) => resources.createResource({ body: req.body, file: req.file, user: req.user }), 201);
export const createResourceVersion = respond((req) => resources.createResourceVersion({ resourceId: req.params.resourceId, body: req.body, file: req.file, user: req.user }), 201);
export const getResourceUsages = respond((req) => resources.getResourceUsages({ resourceId: req.params.resourceId, user: req.user }));
export const deleteResource = respond((req) => resources.deleteResource({ resourceId: req.params.resourceId, user: req.user }));
export const searchTeachingResources = respond((req) => teachingHub.searchTeachingResources({ query: req.query, user: req.user }));
export const importTeachingResource = respond((req) => teachingHub.importTeachingResource({ body: req.body, user: req.user }), 201);
