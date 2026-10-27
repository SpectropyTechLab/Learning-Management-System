import { Router } from 'express';
import {
  addPackItems,
  attachCourseToPack,
  createCourse,
  createPack,
  getCourseContent,
  importCourseContent,
  getPackItems,
  getPackSummary,
  listCourses,
  listPacks,
  removePackItem,
} from '../controllers/packBuilder.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/packs', requireRole(['super_admin', 'content_authorizer']), listPacks);
router.post('/packs', requireRole(['super_admin', 'content_authorizer']), createPack);
router.get('/packs/:id/items', requireRole(['super_admin', 'content_authorizer']), getPackItems);
router.get('/packs/:id/summary', requireRole(['super_admin', 'content_authorizer']), getPackSummary);
router.post('/packs/:id/items', requireRole(['super_admin', 'content_authorizer']), addPackItems);
router.delete('/packs/:id/items/:itemId', requireRole(['super_admin', 'content_authorizer']), removePackItem);
router.post('/packs/:id/attach-course', requireRole(['super_admin', 'content_authorizer']), attachCourseToPack);

router.get('/courses', requireRole(['super_admin', 'content_authorizer']), listCourses);
router.get('/courses/:id/content', requireRole(['super_admin', 'content_authorizer']), getCourseContent);
router.post('/courses', requireRole(['super_admin', 'content_authorizer']), createCourse);
router.post('/courses/:id/import-content', requireRole(['super_admin', 'content_authorizer']), importCourseContent);

export default router;
