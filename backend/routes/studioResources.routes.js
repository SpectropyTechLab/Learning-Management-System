import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, attachClientContext, requireRole } from '../middleware/auth.js';
import {
  listResources, getResource, renameResource, createResource, createResourceVersion, getResourceUsages, deleteResource,
} from '../controllers/studioResources.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 250 * 1024 * 1024 } });
const authors = requireRole(['super_admin', 'content_authorizer']);

// Keep author authorization inside the Resource route namespace. A global
// router middleware here would also reject unrelated /api/studio routes that
// are mounted after this router, including teacher discovery requests.
router.use('/studio/resources', authenticateToken, attachClientContext, authors);
router.get('/studio/resources', listResources);
router.get('/studio/resources/:resourceId', getResource);
router.get('/studio/resources/:resourceId/usages', getResourceUsages);
router.patch('/studio/resources/:resourceId', renameResource);
router.post('/studio/resources', upload.single('file'), createResource);
router.post('/studio/resources/:resourceId/versions', upload.single('file'), createResourceVersion);
router.delete('/studio/resources/:resourceId', deleteResource);

export default router;
