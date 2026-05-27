import { Router } from 'express';
import multer from 'multer';
import {
  listTrackerProgramOptions,
  listTrackerGradeOptions,
  listTrackerSubjectOptions,
  uploadMicroSchedule,
  listMicroScheduleUploads,
  getMicroScheduleRows,
  uploadLessonPlanner,
  listLessonPlannerUploads,
  getLessonPlannerSessions,
  mapProgramSessionTemplates,
  listProgramSessionTemplates,
  publishProgramSessionTemplates,
  listClientEntitlements,
  createClientEntitlement,
  updateClientEntitlement,
  generateTeachingSessions,
  listTeachingSessions,
  updateTeachingSessionAssignment,
  createTeacherTrackerPermission,
  listTeacherTrackerPermissions,
  deleteTeacherTrackerPermission,
  listMyTeachingSessions,
  getMyTeachingSessionById,
  createTeachingSessionUpdate,
  getTeachingSessionAnalytics,
} from '../controllers/teachingSessions.controller.js';
import {
  authenticateToken,
  requireRole,
  attachClientContext,
  loadPermissions,
  checkPermission,
} from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.use(authenticateToken, attachClientContext, loadPermissions);

router.get(
  '/teaching-sessions/program-options',
  requireRole(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher']),
  listTrackerProgramOptions
);
router.get(
  '/teaching-sessions/program-options/:programId/grades',
  requireRole(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher']),
  listTrackerGradeOptions
);
router.get(
  '/teaching-sessions/program-options/:programId/grades/:gradeId/subjects',
  requireRole(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher']),
  listTrackerSubjectOptions
);

router.get(
  '/teaching-sessions/programs/micro-schedules',
  requireRole(['super_admin', 'content_authorizer']),
  checkPermission('teaching_sessions.program_upload'),
  listMicroScheduleUploads
);
router.post(
  '/teaching-sessions/programs/micro-schedules',
  requireRole(['super_admin', 'content_authorizer']),
  checkPermission('teaching_sessions.program_upload'),
  upload.single('file'),
  uploadMicroSchedule
);
router.get(
  '/teaching-sessions/programs/micro-schedules/:uploadId/rows',
  requireRole(['super_admin', 'content_authorizer']),
  checkPermission('teaching_sessions.program_upload'),
  getMicroScheduleRows
);

router.get(
  '/teaching-sessions/programs/lesson-planners',
  requireRole(['super_admin', 'content_authorizer']),
  checkPermission('teaching_sessions.program_upload'),
  listLessonPlannerUploads
);
router.post(
  '/teaching-sessions/programs/lesson-planners',
  requireRole(['super_admin', 'content_authorizer']),
  checkPermission('teaching_sessions.program_upload'),
  upload.single('file'),
  uploadLessonPlanner
);
router.get(
  '/teaching-sessions/programs/lesson-planners/:uploadId/sessions',
  requireRole(['super_admin', 'content_authorizer']),
  checkPermission('teaching_sessions.program_upload'),
  getLessonPlannerSessions
);

router.post(
  '/teaching-sessions/programs/:programId/templates/map',
  requireRole(['super_admin', 'content_authorizer']),
  checkPermission('teaching_sessions.program_publish'),
  mapProgramSessionTemplates
);
router.get(
  '/teaching-sessions/programs/:programId/templates',
  requireRole(['super_admin', 'content_authorizer', 'client_admin']),
  listProgramSessionTemplates
);
router.post(
  '/teaching-sessions/programs/:programId/templates/publish',
  requireRole(['super_admin', 'content_authorizer']),
  checkPermission('teaching_sessions.program_publish'),
  publishProgramSessionTemplates
);

router.get(
  '/teaching-sessions/entitlements',
  requireRole(['super_admin', 'client_admin']),
  listClientEntitlements
);
router.post(
  '/teaching-sessions/entitlements',
  requireRole(['super_admin']),
  checkPermission('teaching_sessions.feature_enable'),
  createClientEntitlement
);
router.patch(
  '/teaching-sessions/entitlements/:id',
  requireRole(['super_admin']),
  checkPermission('teaching_sessions.feature_enable'),
  updateClientEntitlement
);

router.post(
  '/teaching-sessions/sessions/generate',
  requireRole(['super_admin', 'client_admin']),
  checkPermission('teaching_sessions.client_setup'),
  generateTeachingSessions
);
router.get(
  '/teaching-sessions/sessions',
  requireRole(['super_admin', 'client_admin', 'school_owner', 'teacher']),
  listTeachingSessions
);
router.patch(
  '/teaching-sessions/sessions/:id',
  requireRole(['super_admin', 'client_admin']),
  checkPermission('teaching_sessions.assign_teacher'),
  updateTeachingSessionAssignment
);

router.get(
  '/teaching-sessions/permissions',
  requireRole(['super_admin', 'client_admin']),
  checkPermission('teaching_sessions.assign_teacher'),
  listTeacherTrackerPermissions
);
router.post(
  '/teaching-sessions/permissions',
  requireRole(['super_admin', 'client_admin']),
  checkPermission('teaching_sessions.assign_teacher'),
  createTeacherTrackerPermission
);
router.delete(
  '/teaching-sessions/permissions/:id',
  requireRole(['super_admin', 'client_admin']),
  checkPermission('teaching_sessions.assign_teacher'),
  deleteTeacherTrackerPermission
);

router.get(
  '/teaching-sessions/my-sessions',
  requireRole(['teacher']),
  checkPermission('teaching_sessions.read_own'),
  listMyTeachingSessions
);
router.get(
  '/teaching-sessions/my-sessions/:id',
  requireRole(['teacher']),
  checkPermission('teaching_sessions.read_own'),
  getMyTeachingSessionById
);
router.post(
  '/teaching-sessions/my-sessions/:id/updates',
  requireRole(['teacher']),
  checkPermission('teaching_sessions.update_own'),
  createTeachingSessionUpdate
);

router.get(
  '/teaching-sessions/analytics',
  requireRole(['super_admin', 'client_admin', 'school_owner', 'teacher']),
  getTeachingSessionAnalytics
);

export default router;
