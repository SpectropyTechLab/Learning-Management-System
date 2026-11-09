import { Router } from 'express';
import { authenticateToken, attachClientContext, requireRole } from '../middleware/auth.js';
import { createTerm, getScreenTerms, getTopicTerms, listTerms, setScreenTerms, setTopicTerms } from '../controllers/studioTaxonomy.controller.js';

const router = Router();
const readers = requireRole(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher']);
const authors = requireRole(['super_admin', 'content_authorizer']);

router.use(authenticateToken, attachClientContext, readers);
router.get('/studio/taxonomy', listTerms);
router.post('/studio/taxonomy', authors, createTerm);
router.get('/studio/topics/:topicId/taxonomy', getTopicTerms);
router.put('/studio/topics/:topicId/taxonomy', authors, setTopicTerms);
router.get('/studio/screens/:screenId/taxonomy', getScreenTerms);
router.put('/studio/screens/:screenId/taxonomy', authors, setScreenTerms);

export default router;

