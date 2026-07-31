import { Router } from 'express';
import {
  listClients,
  createClient,
  updateClient,
  deactivateClient,
  listContentPacks,
  createContentPack,
  updateContentPack,
  deactivateContentPack,
  addContentPackItems,
  removeContentPackItem,
  //syncContentPackEntitlements,
  listPrograms,
  listEntitlements,
  createEntitlement,
  updateEntitlement,
  revokeEntitlement,
} from '../controllers/platform.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Clients (super_admin only)
router.get('/clients', requireRole(['super_admin']), listClients);
router.post('/clients', requireRole(['super_admin']), createClient);
router.patch('/clients/:id', requireRole(['super_admin']), updateClient);
router.delete('/clients/:id', requireRole(['super_admin']), deactivateClient);

// Content packs (super_admin, content_authorizer)
router.get('/content-packs', requireRole(['super_admin', 'content_authorizer']), listContentPacks);
router.post('/content-packs', requireRole(['super_admin', 'content_authorizer']), createContentPack);
router.patch('/content-packs/:id', requireRole(['super_admin', 'content_authorizer']), updateContentPack);
router.delete('/content-packs/:id', requireRole(['super_admin', 'content_authorizer']), deactivateContentPack);
router.post('/content-packs/:id/items', requireRole(['super_admin', 'content_authorizer']), addContentPackItems);
router.delete('/content-packs/:id/items/:contentId', requireRole(['super_admin', 'content_authorizer']), removeContentPackItem);
//router.post('/content-packs/:id/sync-entitlements', requireRole(['super_admin', 'content_authorizer']), syncContentPackEntitlements);

// Programs (super_admin)
router.get('/programs', requireRole(['super_admin']), listPrograms);

// Entitlements (super_admin, content_authorizer)
router.get('/entitlements', requireRole(['super_admin', 'content_authorizer']), listEntitlements);
router.post('/entitlements', requireRole(['super_admin', 'content_authorizer']), createEntitlement);
router.patch('/entitlements/:id', requireRole(['super_admin', 'content_authorizer']), updateEntitlement);
router.delete('/entitlements/:id', requireRole(['super_admin', 'content_authorizer']), revokeEntitlement);

export default router;
