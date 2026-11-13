import * as taxonomy from '../services/studioTaxonomy.service.js';
import { handleStudioServiceError } from '../utils/errors.js';

const respond = (action) => async (req, res) => {
  try { return res.json({ data: await action(req) }); }
  catch (error) { return handleStudioServiceError(res, error, 'Studio taxonomy request failed'); }
};

export const listTerms = respond((req) => taxonomy.listTerms({ type: req.query.type, search: req.query.search, user: req.user }));
export const createTerm = respond((req) => taxonomy.createTerm({ type: req.body.type, value: req.body.value, user: req.user }));
export const getTopicTerms = respond((req) => taxonomy.getTopicTerms({ topicId: req.params.topicId, user: req.user }));
export const setTopicTerms = respond((req) => taxonomy.setTopicTerms({ topicId: req.params.topicId, body: req.body, user: req.user }));
export const getScreenTerms = respond((req) => taxonomy.getScreenTerms({ screenId: req.params.screenId, user: req.user }));
export const setScreenTerms = respond((req) => taxonomy.setScreenTerms({ screenId: req.params.screenId, body: req.body, user: req.user }));
