import { Router } from 'express';
import {
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
} from '../controllers/curriculum.controller.js';
import { authenticateToken, requireRole, attachClientContext, loadPermissions, checkPermission } from '../middleware/auth.js';

const router = Router();

router.use(
  authenticateToken,
  requireRole(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher', 'student']),
  attachClientContext,
  loadPermissions
);

// Programs
router.get('/programs', checkPermission('questions.read'), listPrograms);
router.get('/programs/:id', checkPermission('questions.read'), getProgram);
router.post('/programs', checkPermission('questions.create'), createProgram);
router.patch('/programs/:id', checkPermission('questions.create'), updateProgram);
router.delete('/programs/:id', checkPermission('questions.delete'), deleteProgram);

// Grades
router.get('/programs/:programId/grades', checkPermission('questions.read'), listGrades);
router.get('/grades/:id', checkPermission('questions.read'), getGrade);
router.post('/programs/:programId/grades', checkPermission('questions.create'), createGrade);
router.patch('/grades/:id', checkPermission('questions.create'), updateGrade);
router.delete('/grades/:id', checkPermission('questions.delete'), deleteGrade);

// Subjects
router.get('/subjects', checkPermission('questions.read'), listSubjects);
router.get('/grades/:gradeId/subjects', checkPermission('questions.read'), listSubjectsByGrade);
router.get('/subjects/:id', checkPermission('questions.read'), getSubject);
router.post('/subjects', checkPermission('questions.create'), createSubject);
router.patch('/subjects/:id', checkPermission('questions.create'), updateSubject);
router.delete('/subjects/:id', checkPermission('questions.delete'), deleteSubject);

// Chapters
router.get('/subjects/:subjectId/chapters', checkPermission('questions.read'), listChapters);
router.get('/chapters/:id', checkPermission('questions.read'), getChapter);
router.post('/subjects/:subjectId/chapters', checkPermission('questions.create'), createChapter);
router.patch('/chapters/:id', checkPermission('questions.create'), updateChapter);
router.delete('/chapters/:id', checkPermission('questions.delete'), deleteChapter);

// Topics
router.get('/chapters/:chapterId/topics', checkPermission('questions.read'), listTopics);
router.get('/topics/:id', checkPermission('questions.read'), getTopic);
router.post('/chapters/:chapterId/topics', checkPermission('questions.create'), createTopic);
router.patch('/topics/:id', checkPermission('questions.create'), updateTopic);
router.delete('/topics/:id', checkPermission('questions.delete'), deleteTopic);

export default router;
