import { Router } from 'express';
import { createCourse, getAllCourses, getCourseContent, createContentItem, publishCourse, deleteCourse, updateCourse } from '../controllers/admin.controller.js';
import { authenticateToken, requireRole, attachClientContext, loadPermissions, checkPermission } from '../middleware/auth.js';
import { upload, uploadContentFile, viewScormFile, updateContentFile } from '../controllers/scorm.controller.js';
import helmet from "helmet";
import { deleteContentItem, renameContentItem, reorderContentItems } from "../controllers/content.controller.js";

const router = Router();

// Authenticated SCORM viewer
router.get("/view/*", authenticateToken, viewScormFile);

// Auth + RBAC chain for admin routes
router.use(
  authenticateToken,
  requireRole(['super_admin', 'client_admin', 'content_authorizer', 'teacher']),
  attachClientContext,
  loadPermissions
);

router.get('/courses', checkPermission('courses.read'), getAllCourses);

router.delete('/courses/:id', checkPermission('courses.delete'), deleteCourse);

router.patch('/courses/:id', checkPermission('courses.update'), updateCourse);

router.post('/courses', checkPermission('courses.create'), createCourse);
router.patch('/courses/:id/publish', checkPermission('courses.publish'), publishCourse); // <-- ADD THIS

router.get('/courses/:courseId/content', checkPermission('courses.read'), getCourseContent);

router.post('/courses/:courseId/content', checkPermission('courses.update'), createContentItem);
router.post('/courses/:courseId/content/upload', checkPermission('courses.update'), upload.single('file'), uploadContentFile);
router.delete("/courses/:courseId/content/:id", checkPermission('courses.update'), deleteContentItem);
router.put("/courses/:courseId/content/:id/rename", checkPermission('courses.update'), renameContentItem);
router.put("/courses/:courseId/content/:itemId/file", checkPermission('courses.update'), upload.single("file"), updateContentFile);
router.put("/courses/:courseId/content/reorder", checkPermission('courses.update'), reorderContentItems);

export default router;
