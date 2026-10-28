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

router.use(
  authenticateToken,
  requireRole(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher', 'student']),
  attachClientContext,
  loadPermissions
);

// Boards
router.get('/boards', checkPermission('curriculum.read'), listBoards);
router.get('/boards/:id', checkPermission('curriculum.read'), getBoard);
router.post('/boards', checkPermission('curriculum.create'), createBoard);
router.patch('/boards/:id', checkPermission('curriculum.create'), updateBoard);
router.delete('/boards/:id', checkPermission('curriculum.delete'), deleteBoard);
router.get('/boards/:boardId/programs', checkPermission('curriculum.read'), listProgramsByBoard);
router.post('/boards/:boardId/programs', checkPermission('curriculum.create'), createProgramForBoard);

// Programs
router.get('/programs', checkPermission('curriculum.read'), listPrograms);
router.get('/programs/:id', checkPermission('curriculum.read'), getProgram);
router.post('/programs', checkPermission('curriculum.create'), createProgram);
router.patch('/programs/:id', checkPermission('curriculum.create'), updateProgram);
router.delete('/programs/:id', checkPermission('curriculum.delete'), deleteProgram);

// Grades
router.get('/programs/:programId/grades', checkPermission('curriculum.read'), listGrades);
router.get('/grades/:id', checkPermission('curriculum.read'), getGrade);
router.post('/programs/:programId/grades', checkPermission('curriculum.create'), createGrade);
router.patch('/grades/:id', checkPermission('curriculum.create'), updateGrade);
router.delete('/grades/:id', checkPermission('curriculum.delete'), deleteGrade);

// Subjects
router.get('/subjects', checkPermission('curriculum.read'), listSubjects);
router.get('/grades/:gradeId/subjects', checkPermission('curriculum.read'), listSubjectsByGrade);
router.get('/subjects/:id', checkPermission('curriculum.read'), getSubject);
router.post('/subjects', checkPermission('curriculum.create'), createSubject);
router.patch('/subjects/:id', checkPermission('curriculum.create'), updateSubject);
router.delete('/subjects/:id', checkPermission('curriculum.delete'), deleteSubject);

// Chapters
router.get('/subjects/:subjectId/chapters', checkPermission('curriculum.read'), listChapters);
router.get('/chapters/:id', checkPermission('curriculum.read'), getChapter);
router.post('/subjects/:subjectId/chapters', checkPermission('curriculum.create'), createChapter);
router.patch('/chapters/:id', checkPermission('curriculum.create'), updateChapter);
router.delete('/chapters/:id', checkPermission('curriculum.delete'), deleteChapter);

// Topics
router.get('/chapters/:chapterId/topics', checkPermission('curriculum.read'), listTopics);
router.get('/topics/:id', checkPermission('curriculum.read'), getTopic);
router.post('/chapters/:chapterId/topics', checkPermission('curriculum.create'), createTopic);
router.patch('/topics/:id', checkPermission('curriculum.create'), updateTopic);
router.delete('/topics/:id', checkPermission('curriculum.delete'), deleteTopic);

// Subtopics
router.get('/topics/:topicId/subtopics', checkPermission('curriculum.read'), listSubtopics);
router.post('/topics/:topicId/subtopics', checkPermission('curriculum.create'), createSubtopic);
router.get('/subtopics/:id', checkPermission('curriculum.read'), getSubtopic);
router.patch('/subtopics/:id', checkPermission('curriculum.create'), updateSubtopic);
router.delete('/subtopics/:id', checkPermission('curriculum.delete'), deleteSubtopic);

export default router;
