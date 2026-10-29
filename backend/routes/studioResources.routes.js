import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, attachClientContext, requireRole } from '../middleware/auth.js';
import {
  listResources, getResource, createResource, createResourceVersion, getResourceUsages,
} from '../controllers/studioResources.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 250 * 1024 * 1024 } });
const authors = requireRole(['super_admin', 'content_authorizer']);

router.use(authenticateToken, attachClientContext, authors);
router.get('/studio/resources', listResources);
router.get('/studio/resources/:resourceId', getResource);
router.get('/studio/resources/:resourceId/usages', getResourceUsages);
router.post('/studio/resources', upload.single('file'), createResource);
router.post('/studio/resources/:resourceId/versions', upload.single('file'), createResourceVersion);

export default router;
