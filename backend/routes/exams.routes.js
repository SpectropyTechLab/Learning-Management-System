import { Router } from 'express';
import {
  listBlueprints,
  getBlueprintById,
  createBlueprint,
  updateBlueprint,
  deleteBlueprint,
  listExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  createExamSection,
  updateExamSection,
  deleteExamSection,
  addQuestionToSection,
  removeQuestionFromSection,
  clearQuestionGroupFromSection,
  replaceQuestionInSection,
  publishExam,
  getExamAssignedCourses,
  assignExamCourses,
  getExamResults,
  getExamSectionSyllabusOptions,
  configureExamSectionSyllabus,
  previewExamSectionGeneration,
  generateExamSectionQuestions,
  getExamPreview,
  downloadExamPreviewDocx,
  downloadExamPreviewQuestionsDocx,
  downloadExamPreviewAnswersDocx,
  downloadExamPreviewSolutionsDocx,
  finalizeExamBlueprint,
} from '../controllers/exams.controller.js';
import { authenticateToken, attachClientContext, loadPermissions, checkPermission } from '../middleware/auth.js';
import {
  requireExamFeatureEntitlement,
  requireExamProgramEntitlement,
} from '../middleware/moduleEntitlements.js';

const router = Router();

router.use(
  authenticateToken,
  attachClientContext,
  loadPermissions,
  requireExamFeatureEntitlement
);

router.get('/exams', requireExamProgramEntitlement, checkPermission('exams.read'), listExams);
router.get('/exams/:id', requireExamProgramEntitlement, checkPermission('exams.read'), getExamById);
router.post('/exams', requireExamProgramEntitlement, checkPermission('exams.create'), createExam);
router.put('/exams/:id', requireExamProgramEntitlement, checkPermission('exams.update'), updateExam);
router.delete('/exams/:id', checkPermission('exams.delete'), deleteExam);

router.get('/blueprints', checkPermission('exams.read'), listBlueprints);
router.get('/blueprints/:id', checkPermission('exams.read'), getBlueprintById);
router.post('/blueprints', checkPermission('exams.create'), createBlueprint);
router.put('/blueprints/:id', checkPermission('exams.update'), updateBlueprint);
router.delete('/blueprints/:id', checkPermission('exams.delete'), deleteBlueprint);

router.post('/exams/:id/sections', requireExamProgramEntitlement, checkPermission('exams.update'), createExamSection);
router.put('/exams/:id/sections/:sectionId', requireExamProgramEntitlement, checkPermission('exams.update'), updateExamSection);
router.delete('/exams/:id/sections/:sectionId', requireExamProgramEntitlement, checkPermission('exams.update'), deleteExamSection);
router.get('/exams/:id/sections/:sectionId/syllabus-options', requireExamProgramEntitlement, checkPermission('exams.read'), getExamSectionSyllabusOptions);
router.put('/exams/:id/sections/:sectionId/configure', requireExamProgramEntitlement, checkPermission('exams.update'), configureExamSectionSyllabus);
router.get('/exams/:id/sections/:sectionId/generation-plan', requireExamProgramEntitlement, checkPermission('exams.read'), previewExamSectionGeneration);
router.post('/exams/:id/sections/:sectionId/generate', requireExamProgramEntitlement, checkPermission('exams.update'), generateExamSectionQuestions);
router.get('/exams/:id/preview', requireExamProgramEntitlement, checkPermission('exams.read'), getExamPreview);
router.get('/exams/:id/preview-docx', requireExamProgramEntitlement, checkPermission('exams.read'), downloadExamPreviewDocx);
router.get('/exams/:id/preview/docx/questions', requireExamProgramEntitlement, checkPermission('exams.read'), downloadExamPreviewQuestionsDocx);
router.get('/exams/:id/preview/docx/answers', requireExamProgramEntitlement, checkPermission('exams.read'), downloadExamPreviewAnswersDocx);
router.get('/exams/:id/preview/docx/solutions', requireExamProgramEntitlement, checkPermission('exams.read'), downloadExamPreviewSolutionsDocx);
router.post('/exams/:id/finalize', requireExamProgramEntitlement, checkPermission('exams.update'), finalizeExamBlueprint);

router.post('/exams/:id/sections/:sectionId/questions', requireExamProgramEntitlement, checkPermission('exams.update'), addQuestionToSection);
router.delete('/exams/:id/sections/:sectionId/questions/:questionId', requireExamProgramEntitlement, checkPermission('exams.update'), removeQuestionFromSection);
router.delete('/exams/:id/sections/:sectionId/questions/group/:groupType', requireExamProgramEntitlement, checkPermission('exams.update'), clearQuestionGroupFromSection);
router.put('/exams/:id/sections/:sectionId/questions/replace', requireExamProgramEntitlement, checkPermission('exams.update'), replaceQuestionInSection);
router.post('/exams/:id/publish', requireExamProgramEntitlement, checkPermission('exams.publish'), publishExam);
router.get('/exams/:id/results', requireExamProgramEntitlement, checkPermission('exams.read'), getExamResults);
router.get('/exams/:id/courses', requireExamProgramEntitlement, checkPermission('exams.read'), getExamAssignedCourses);
router.put('/exams/:id/courses', requireExamProgramEntitlement, checkPermission('exams.update'), assignExamCourses);

export default router;
