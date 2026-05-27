import { Router } from 'express';
import { authenticateToken, requireRole, loadPermissions, checkPermission } from '../middleware/auth.js';
import { createEntitlementHandlers } from '../services/moduleEntitlements.service.js';

const router = Router();
const handlers = createEntitlementHandlers('question_bank');

router.use(authenticateToken);

router.get(
  '/question-bank-entitlements',
  requireRole(['super_admin']),
  handlers.list
);

router.post(
  '/question-bank-entitlements',
  requireRole(['super_admin']),
  loadPermissions,
  checkPermission('questions.create'),
  handlers.create
);

router.patch(
  '/question-bank-entitlements/:id',
  requireRole(['super_admin']),
  loadPermissions,
  checkPermission('questions.create'),
  handlers.update
);

export default router;
