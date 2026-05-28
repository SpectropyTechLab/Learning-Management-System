import { Router } from 'express';
import {
  createCourse,
  getAllCourses,
  getCourseContent,
  createContentItem,
  publishCourse,
  deleteCourse,
  updateCourse,
} from '../controllers/admin.controller.js';
import {
  deleteEnrollment,
  enrollUserByEmail,
  getCourseEnrollments,
  updateEnrollmentRole,
} from '../controllers/enrollment.controller.js';
import { authenticateToken, requireRole, attachClientContext, loadPermissions, checkPermission } from '../middleware/auth.js';
import { upload, uploadContentFile, updateContentFile, viewScormFile } from '../controllers/scorm.controller.js';
import { deleteContentItem, renameContentItem, reorderContentItems } from '../controllers/content.controller.js';

const router = Router();

router.get('/view/*', authenticateToken, viewScormFile);

router.use(
  authenticateToken,
  requireRole(['school_owner']),
  attachClientContext,
  loadPermissions
);

router.get('/courses', checkPermission('courses.read'), getAllCourses);
router.post('/courses', checkPermission('courses.create'), createCourse);
router.patch('/courses/:id', checkPermission('courses.update'), updateCourse);
router.patch('/courses/:id/publish', checkPermission('courses.publish'), publishCourse);
router.delete('/courses/:id', checkPermission('courses.delete'), deleteCourse);

router.get('/courses/:courseId/content', checkPermission('courses.read'), getCourseContent);
router.post('/courses/:courseId/content', checkPermission('courses.update'), createContentItem);
router.post('/courses/:courseId/content/upload', checkPermission('courses.update'), upload.single('file'), uploadContentFile);
router.delete('/courses/:courseId/content/:id', checkPermission('courses.update'), deleteContentItem);
router.put('/courses/:courseId/content/:id/rename', checkPermission('courses.update'), renameContentItem);
router.put('/courses/:courseId/content/:itemId/file', checkPermission('courses.update'), upload.single('file'), updateContentFile);
router.put('/courses/:courseId/content/reorder', checkPermission('courses.update'), reorderContentItems);

router.get('/courses/:courseId/enrollments', checkPermission('courses.update'), getCourseEnrollments);
router.post('/courses/:courseId/enroll-by-email', checkPermission('courses.update'), enrollUserByEmail);
router.delete('/courses/:id/enrollments/:userId', checkPermission('courses.update'), deleteEnrollment);
router.patch('/courses/:id/enrollments/:userId', checkPermission('courses.update'), updateEnrollmentRole);

export default router;
