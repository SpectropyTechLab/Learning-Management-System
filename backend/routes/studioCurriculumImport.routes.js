import { Router } from 'express';
import multer from 'multer';
import {
  attachClientContext,
  authenticateToken,
  checkPermission,
  loadPermissions,
  requireRole,
} from '../middleware/auth.js';
import {
  confirmCurriculumImport,
  downloadCurriculumImportTemplate,
  previewCurriculumImport,
} from '../controllers/studioCurriculumImport.controller.js';

const router = Router();
const authors = requireRole(['super_admin', 'content_authorizer']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(authenticateToken, attachClientContext, authors, loadPermissions);
router.get('/studio/curriculum/bulk-import/template', checkPermission('curriculum.create'), downloadCurriculumImportTemplate);
router.post('/studio/curriculum/bulk-import/preview', checkPermission('curriculum.create'), upload.single('file'), previewCurriculumImport);
router.post('/studio/curriculum/bulk-import/confirm', checkPermission('curriculum.create'), confirmCurriculumImport);

export default router;
