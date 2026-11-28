import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, attachClientContext, requireRole } from '../middleware/auth.js';
import { commitPptx, preflightPptx } from '../controllers/studioPptxImport.controller.js';
import { exportPptx } from '../controllers/studioPptxExport.controller.js';
import { handleStudioServiceError, AppError } from '../utils/errors.js';

const router = Router();
const authors = requireRole(['super_admin', 'content_authorizer']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1, fields: 10 },
  fileFilter: (_req, file, callback) => {
    if (!/\.pptx$/i.test(file.originalname || '')) return callback(new AppError('Only .pptx files are supported', 422, 'PPTX_EXTENSION_UNSUPPORTED'));
    return callback(null, true);
  },
});
const acceptPptx = (req, res, next) => upload.single('file')(req, res, (error) => {
  if (!error) return next();
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return handleStudioServiceError(res, new AppError('PowerPoint file exceeds the 100 MB limit', 413, 'PPTX_FILE_TOO_LARGE'));
  }
  return handleStudioServiceError(res, error, 'PowerPoint upload failed');
});

router.use('/studio/sessions/:sessionId/imports/pptx', authenticateToken, attachClientContext, authors);
router.post('/studio/sessions/:sessionId/imports/pptx/preflight', acceptPptx, preflightPptx);
router.post('/studio/sessions/:sessionId/imports/pptx/commit', acceptPptx, commitPptx);
router.get('/studio/sessions/:sessionId/exports/pptx', authenticateToken, attachClientContext, authors, exportPptx);

export default router;
