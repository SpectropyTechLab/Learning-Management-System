import { Router } from 'express';
import {
  listQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  listComprehensionPassages,
  getComprehensionPassageById,
  createComprehensionPassage,
  updateComprehensionPassage,
  softDeleteQuestion,
  approveQuestion,
  rejectQuestion,
  bulkUploadQuestions,
  bulkUploadTemplate,
  downloadConvertedQuestions,
  insertConvertedQuestions,
  listQuestionFolders,
  getQuestionFolderById,
  createQuestionFolder,
  updateQuestionFolder,
  archiveQuestionFolderQuestions,
} from '../controllers/questions.controller.js';
import { authenticateToken, requireRole, attachClientContext, loadPermissions, checkPermission } from '../middleware/auth.js';
import {
  requireQuestionBankFeatureEntitlement,
  requireQuestionBankProgramEntitlement,
} from '../middleware/moduleEntitlements.js';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.use(
  authenticateToken,
  requireRole(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher']),
  attachClientContext,
  loadPermissions,
  requireQuestionBankFeatureEntitlement
);
router.get('/questions', requireQuestionBankProgramEntitlement, checkPermission('questions.read'), listQuestions);
router.get('/questions/bulk-upload/template', checkPermission('questions.read'), bulkUploadTemplate);
router.post('/questions/bulk-upload', requireQuestionBankProgramEntitlement, checkPermission('questions.create'), upload.single('file'), bulkUploadQuestions);
router.post('/questions/converter/download', checkPermission('questions.create'), upload.single('file'), downloadConvertedQuestions);
router.post('/questions/converter/insert', requireQuestionBankProgramEntitlement, checkPermission('questions.create'), upload.single('file'), insertConvertedQuestions);
router.get('/questions/:id', requireQuestionBankProgramEntitlement, checkPermission('questions.read'), getQuestionById);
router.post('/questions', requireQuestionBankProgramEntitlement, checkPermission('questions.create'), createQuestion);
router.put('/questions/:id', requireQuestionBankProgramEntitlement, checkPermission('questions.create'), updateQuestion);
router.delete('/questions/:id', checkPermission('questions.delete'), softDeleteQuestion);
router.post('/questions/:id/approve', checkPermission('questions.approve'), approveQuestion);
router.post('/questions/:id/reject', checkPermission('questions.reject'), rejectQuestion);

router.get('/question-folders', checkPermission('questions.read'), listQuestionFolders);
router.get('/question-folders/:id', checkPermission('questions.read'), getQuestionFolderById);
router.post('/question-folders', checkPermission('questions.create'), createQuestionFolder);
router.patch('/question-folders/:id', checkPermission('questions.create'), updateQuestionFolder);
router.delete('/question-folders/:id/questions', checkPermission('questions.delete'), archiveQuestionFolderQuestions);

router.get('/comprehension-passages', checkPermission('questions.read'), listComprehensionPassages);
router.get('/comprehension-passages/:id', checkPermission('questions.read'), getComprehensionPassageById);
router.post('/comprehension-passages', checkPermission('questions.create'), createComprehensionPassage);
router.put('/comprehension-passages/:id', checkPermission('questions.create'), updateComprehensionPassage);

export default router;
