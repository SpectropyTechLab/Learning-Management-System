import { Router } from 'express';
import { authenticateToken, attachClientContext, requireRole } from '../middleware/auth.js';
import {
  listLayouts, getLayout, createLayout, updateLayout, createScreen,
} from '../controllers/studioLayouts.controller.js';

const router = Router();
const studioReaders = requireRole(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher', 'student']);
const studioAuthors = requireRole(['super_admin', 'content_authorizer']);

router.use(authenticateToken, attachClientContext, studioReaders);
router.get('/studio/layouts', listLayouts);
router.get('/studio/layouts/:layoutId', getLayout);
router.post('/studio/layouts', studioAuthors, createLayout);
router.patch('/studio/layouts/:layoutId', studioAuthors, updateLayout);
router.post('/studio/sessions/:sessionId/screens', studioAuthors, createScreen);

export default router;
