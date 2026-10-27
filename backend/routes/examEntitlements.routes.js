import { Router } from 'express';
import { authenticateToken, requireRole, loadPermissions, checkPermission } from '../middleware/auth.js';
import { createEntitlementHandlers } from '../services/moduleEntitlements.service.js';

const router = Router();
const handlers = createEntitlementHandlers('exams');

router.use(authenticateToken);

router.get(
  '/exam-entitlements',
  requireRole(['super_admin']),
  handlers.list
);

router.post(
  '/exam-entitlements',
  requireRole(['super_admin']),
  loadPermissions,
  checkPermission('exams.create'),
  handlers.create
);

router.patch(
  '/exam-entitlements/:id',
  requireRole(['super_admin']),
  loadPermissions,
  checkPermission('exams.create'),
  handlers.update
);

export default router;
