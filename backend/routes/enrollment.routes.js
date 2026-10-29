import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { enrollUserByEmail, enrollUsersBulk, getCourseEnrollments, deleteEnrollment, updateEnrollmentRole} from "../controllers/enrollment.controller.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/courses/:courseId/enroll-by-email',  authenticateToken,enrollUserByEmail);
router.post('/courses/:courseId/enroll-bulk', authenticateToken, upload.single('file'), enrollUsersBulk);
router.get('/courses/:courseId/enrollments', authenticateToken,getCourseEnrollments);

router.delete('/courses/:id/enrollments/:userId', authenticateToken, deleteEnrollment);
router.patch('/courses/:id/enrollments/:userId', authenticateToken, updateEnrollmentRole);

export default router;
