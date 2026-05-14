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

const router = Router();

router.use(
  authenticateToken,
  attachClientContext,
  loadPermissions
);

router.get('/exams', checkPermission('exams.read'), listExams);
router.get('/exams/:id', checkPermission('exams.read'), getExamById);
router.post('/exams', checkPermission('exams.create'), createExam);
router.put('/exams/:id', checkPermission('exams.update'), updateExam);
router.delete('/exams/:id', checkPermission('exams.delete'), deleteExam);

router.get('/blueprints', checkPermission('exams.read'), listBlueprints);
router.get('/blueprints/:id', checkPermission('exams.read'), getBlueprintById);
router.post('/blueprints', checkPermission('exams.create'), createBlueprint);
router.put('/blueprints/:id', checkPermission('exams.update'), updateBlueprint);
router.delete('/blueprints/:id', checkPermission('exams.delete'), deleteBlueprint);

router.post('/exams/:id/sections', checkPermission('exams.update'), createExamSection);
router.put('/exams/:id/sections/:sectionId', checkPermission('exams.update'), updateExamSection);
router.delete('/exams/:id/sections/:sectionId', checkPermission('exams.update'), deleteExamSection);
router.get('/exams/:id/sections/:sectionId/syllabus-options', checkPermission('exams.read'), getExamSectionSyllabusOptions);
router.put('/exams/:id/sections/:sectionId/configure', checkPermission('exams.update'), configureExamSectionSyllabus);
router.get('/exams/:id/sections/:sectionId/generation-plan', checkPermission('exams.read'), previewExamSectionGeneration);
router.post('/exams/:id/sections/:sectionId/generate', checkPermission('exams.update'), generateExamSectionQuestions);
router.get('/exams/:id/preview', checkPermission('exams.read'), getExamPreview);
router.get('/exams/:id/preview-docx', checkPermission('exams.read'), downloadExamPreviewDocx);
router.get('/exams/:id/preview/docx/questions', checkPermission('exams.read'), downloadExamPreviewQuestionsDocx);
router.get('/exams/:id/preview/docx/answers', checkPermission('exams.read'), downloadExamPreviewAnswersDocx);
router.get('/exams/:id/preview/docx/solutions', checkPermission('exams.read'), downloadExamPreviewSolutionsDocx);
router.post('/exams/:id/finalize', checkPermission('exams.update'), finalizeExamBlueprint);

router.post('/exams/:id/sections/:sectionId/questions', checkPermission('exams.update'), addQuestionToSection);
router.delete('/exams/:id/sections/:sectionId/questions/:questionId', checkPermission('exams.update'), removeQuestionFromSection);
router.delete('/exams/:id/sections/:sectionId/questions/group/:groupType', checkPermission('exams.update'), clearQuestionGroupFromSection);
router.put('/exams/:id/sections/:sectionId/questions/replace', checkPermission('exams.update'), replaceQuestionInSection);
router.post('/exams/:id/publish', checkPermission('exams.publish'), publishExam);
router.get('/exams/:id/results', checkPermission('exams.read'), getExamResults);
router.get('/exams/:id/courses', checkPermission('exams.read'), getExamAssignedCourses);
router.put('/exams/:id/courses', checkPermission('exams.update'), assignExamCourses);

export default router;
