// backend/routes/auth.routes.js
import { Router } from 'express';
import { login, refreshToken, logout } from '../controllers/auth.controller.js';
import { authenticateToken, attachClientContext, loadPermissions } from '../middleware/auth.js';
import { enrichAuthUser } from '../services/authUser.service.js';
import { resolveModuleVisibility } from '../services/moduleVisibility.service.js';

const router = Router();

router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);


// ✅ Add user refresh route (for frontend reloads)
router.get('/me', authenticateToken, attachClientContext, loadPermissions, async (req, res) => {
    try {
        // req.user comes from authenticateToken middleware
        const { id, email, full_name, role, is_active, client_id, user_id } = req.user;
        const permissions = req.permissions;
        const granted = [];
        if (permissions instanceof Map) {
            permissions.forEach((value, key) => {
                if (value === true) granted.push(key);
            });
        } else if (permissions instanceof Set) {
            granted.push(...permissions);
        } else if (Array.isArray(permissions)) {
            granted.push(...permissions);
        }

        const user = await enrichAuthUser({ id, email, full_name, role, is_active, client_id, user_id });
        const moduleVisibility = await resolveModuleVisibility({ user: req.user, permissions });
        res.json({ user, permissions: granted, module_visibility: moduleVisibility });
        //console.log('Refreshed user data for:', { user: { id, email, full_name, role, is_active, client_id, user_id } });
    } catch (error) {
        console.error('Error in /me:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/module-visibility', authenticateToken, attachClientContext, loadPermissions, async (req, res) => {
    try {
        const moduleVisibility = await resolveModuleVisibility({
            user: req.user,
            permissions: req.permissions,
        });
        res.json(moduleVisibility);
    } catch (error) {
        console.error('Error in /module-visibility:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
