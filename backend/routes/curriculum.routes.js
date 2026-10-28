import { Router } from 'express';
import {
  listBoards,
  getBoard,
  createBoard,
  updateBoard,
  deleteBoard,
  listProgramsByBoard,
  createProgramForBoard,
  listPrograms,
  getProgram,
  createProgram,
  updateProgram,
  deleteProgram,
  listGrades,
  getGrade,
  createGrade,
  updateGrade,
  deleteGrade,
  listSubjects,
  listSubjectsByGrade,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  listChapters,
  getChapter,
  createChapter,
  updateChapter,
  deleteChapter,
  listTopics,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic,
  listSubtopics,
  getSubtopic,
  createSubtopic,
  updateSubtopic,
  deleteSubtopic,
} from '../controllers/curriculum.controller.js';
import { authenticateToken, requireRole, attachClientContext, loadPermissions, checkPermission } from '../middleware/auth.js';

const router = Router();

export const curriculumWriterOnly = requireRole(['super_admin', 'content_authorizer']);
export const requireCurriculumCreate = checkPermission('curriculum.create');
export const requireCurriculumUpdate = checkPermission('curriculum.update');
export const requireCurriculumDelete = checkPermission('curriculum.delete');

router.use(
  authenticateToken,
  requireRole(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher', 'student']),
  attachClientContext,
  loadPermissions
);

// Boards
router.get('/boards', checkPermission('curriculum.read'), listBoards);
router.get('/boards/:id', checkPermission('curriculum.read'), getBoard);
router.post('/boards', curriculumWriterOnly, requireCurriculumCreate, createBoard);
router.patch('/boards/:id', curriculumWriterOnly, requireCurriculumUpdate, updateBoard);
router.delete('/boards/:id', curriculumWriterOnly, requireCurriculumDelete, deleteBoard);
router.get('/boards/:boardId/programs', checkPermission('curriculum.read'), listProgramsByBoard);
router.post('/boards/:boardId/programs', curriculumWriterOnly, requireCurriculumCreate, createProgramForBoard);

// Programs
router.get('/programs', checkPermission('curriculum.read'), listPrograms);
router.get('/programs/:id', checkPermission('curriculum.read'), getProgram);
router.post('/programs', curriculumWriterOnly, requireCurriculumCreate, createProgram);
router.patch('/programs/:id', curriculumWriterOnly, requireCurriculumUpdate, updateProgram);
router.delete('/programs/:id', curriculumWriterOnly, requireCurriculumDelete, deleteProgram);

// Grades
router.get('/programs/:programId/grades', checkPermission('curriculum.read'), listGrades);
router.get('/grades/:id', checkPermission('curriculum.read'), getGrade);
router.post('/programs/:programId/grades', curriculumWriterOnly, requireCurriculumCreate, createGrade);
router.patch('/grades/:id', curriculumWriterOnly, requireCurriculumUpdate, updateGrade);
router.delete('/grades/:id', curriculumWriterOnly, requireCurriculumDelete, deleteGrade);

// Subjects
router.get('/subjects', checkPermission('curriculum.read'), listSubjects);
router.get('/grades/:gradeId/subjects', checkPermission('curriculum.read'), listSubjectsByGrade);
router.get('/subjects/:id', checkPermission('curriculum.read'), getSubject);
router.post('/subjects', curriculumWriterOnly, requireCurriculumCreate, createSubject);
router.patch('/subjects/:id', curriculumWriterOnly, requireCurriculumUpdate, updateSubject);
router.delete('/subjects/:id', curriculumWriterOnly, requireCurriculumDelete, deleteSubject);

// Chapters
router.get('/subjects/:subjectId/chapters', checkPermission('curriculum.read'), listChapters);
router.get('/chapters/:id', checkPermission('curriculum.read'), getChapter);
router.post('/subjects/:subjectId/chapters', curriculumWriterOnly, requireCurriculumCreate, createChapter);
router.patch('/chapters/:id', curriculumWriterOnly, requireCurriculumUpdate, updateChapter);
router.delete('/chapters/:id', curriculumWriterOnly, requireCurriculumDelete, deleteChapter);

// Topics
router.get('/chapters/:chapterId/topics', checkPermission('curriculum.read'), listTopics);
router.get('/topics/:id', checkPermission('curriculum.read'), getTopic);
router.post('/chapters/:chapterId/topics', curriculumWriterOnly, requireCurriculumCreate, createTopic);
router.patch('/topics/:id', curriculumWriterOnly, requireCurriculumUpdate, updateTopic);
router.delete('/topics/:id', curriculumWriterOnly, requireCurriculumDelete, deleteTopic);

// Subtopics
router.get('/topics/:topicId/subtopics', checkPermission('curriculum.read'), listSubtopics);
router.post('/topics/:topicId/subtopics', curriculumWriterOnly, requireCurriculumCreate, createSubtopic);
router.get('/subtopics/:id', checkPermission('curriculum.read'), getSubtopic);
router.patch('/subtopics/:id', curriculumWriterOnly, requireCurriculumUpdate, updateSubtopic);
router.delete('/subtopics/:id', curriculumWriterOnly, requireCurriculumDelete, deleteSubtopic);

export default router;
