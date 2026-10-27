import { Router } from 'express';
import {
  listSchools,
  createSchool,
  updateSchool,
  deactivateSchool,
  listSchoolMemberships,
  listSchoolCourseAssignments,
  listSchoolExamAssignments,
  listSchoolQuestionBankAssignments,
  addSchoolMembership,
  assignCoursesToSchool,
  assignExamsToSchool,
  assignQuestionBankProgramsToSchool,
  removeCourseAssignmentFromSchool,
  removeExamAssignmentFromSchool,
  removeQuestionBankAssignmentFromSchool,
  removeSchoolMembership,
  listBatches,
  createBatch,
  updateBatch,
  deactivateBatch,
  listBatchMembers,
  addBatchMember,
  removeBatchMember,
  listRolePermissions,
  upsertRolePermission,
  deleteRolePermission,
  listUserPermissions,
  upsertUserPermission,
  deleteUserPermission,
} from '../controllers/hierarchy.controller.js';
import { authenticateToken, requireRole, attachClientContext, loadPermissions, checkAnyPermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken, attachClientContext, loadPermissions);

// Schools
router.get('/schools', requireRole(['super_admin', 'client_admin', 'school_owner']), listSchools);
router.post('/schools', requireRole(['super_admin', 'client_admin']), createSchool);
router.patch('/schools/:id', requireRole(['super_admin', 'client_admin', 'school_owner']), updateSchool);
router.delete('/schools/:id', requireRole(['super_admin', 'client_admin']), deactivateSchool);

// School memberships
router.get('/schools/:schoolId/memberships', requireRole(['super_admin', 'client_admin', 'school_owner']), listSchoolMemberships);
router.get('/schools/:schoolId/course-assignments', requireRole(['super_admin', 'client_admin']), listSchoolCourseAssignments);
router.post('/schools/:schoolId/course-assignments', requireRole(['super_admin', 'client_admin']), assignCoursesToSchool);
router.delete('/schools/:schoolId/course-assignments/:courseId', requireRole(['super_admin', 'client_admin']), removeCourseAssignmentFromSchool);
router.get('/schools/:schoolId/exam-assignments', requireRole(['super_admin', 'client_admin']), checkAnyPermission(['exams.assign', 'exams.create', 'exams.update', 'exams.publish']), listSchoolExamAssignments);
router.post('/schools/:schoolId/exam-assignments', requireRole(['super_admin', 'client_admin']), checkAnyPermission(['exams.assign', 'exams.create', 'exams.update', 'exams.publish']), assignExamsToSchool);
router.delete('/schools/:schoolId/exam-assignments/:examId', requireRole(['super_admin', 'client_admin']), checkAnyPermission(['exams.assign', 'exams.create', 'exams.update', 'exams.publish']), removeExamAssignmentFromSchool);
router.get('/schools/:schoolId/question-bank-assignments', requireRole(['super_admin', 'client_admin']), checkAnyPermission(['questions.assign', 'questions.create', 'questions.approve']), listSchoolQuestionBankAssignments);
router.post('/schools/:schoolId/question-bank-assignments', requireRole(['super_admin', 'client_admin']), checkAnyPermission(['questions.assign', 'questions.create', 'questions.approve']), assignQuestionBankProgramsToSchool);
router.delete('/schools/:schoolId/question-bank-assignments/:programId', requireRole(['super_admin', 'client_admin']), checkAnyPermission(['questions.assign', 'questions.create', 'questions.approve']), removeQuestionBankAssignmentFromSchool);
router.post('/schools/:schoolId/memberships', requireRole(['super_admin', 'client_admin', 'school_owner']), addSchoolMembership);
router.delete('/schools/:schoolId/memberships/:userId', requireRole(['super_admin', 'client_admin', 'school_owner']), removeSchoolMembership);

// Batches
router.get('/batches', requireRole(['super_admin', 'client_admin', 'school_owner', 'teacher', 'student']), listBatches);
router.post('/batches', requireRole(['super_admin', 'client_admin', 'school_owner']), createBatch);
router.patch('/batches/:id', requireRole(['super_admin', 'client_admin', 'school_owner']), updateBatch);
router.delete('/batches/:id', requireRole(['super_admin', 'client_admin', 'school_owner']), deactivateBatch);

// Batch members
router.get('/batches/:batchId/members', requireRole(['super_admin', 'client_admin', 'school_owner', 'teacher', 'student']), listBatchMembers);
router.post('/batches/:batchId/members', requireRole(['super_admin', 'client_admin', 'school_owner', 'teacher']), addBatchMember);
router.delete('/batches/:batchId/members/:userId', requireRole(['super_admin', 'client_admin', 'school_owner', 'teacher']), removeBatchMember);

// Role permissions (super admin only)
router.get('/role-permissions', requireRole(['super_admin', 'client_admin']), listRolePermissions);
router.post('/role-permissions', requireRole(['super_admin', 'client_admin']), upsertRolePermission);
router.delete('/role-permissions/:id', requireRole(['super_admin', 'client_admin']), deleteRolePermission);

// User permissions (super admin, client admin)
router.get('/user-permissions', requireRole(['super_admin', 'client_admin']), listUserPermissions);
router.post('/user-permissions', requireRole(['super_admin', 'client_admin']), upsertUserPermission);
router.delete('/user-permissions/:id', requireRole(['super_admin', 'client_admin']), deleteUserPermission);

export default router;
