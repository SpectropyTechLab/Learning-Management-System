// backend/middleware/auth.js
import jwt from 'jsonwebtoken';
import { query as dbQuery } from '../repositories/db.repository.js';
import {
  clearAuthCookies,
  getRefreshTokenFromRequest,
  getJwtVerifyOptions,
  parseCookies,
  rotateRefreshSession,
  shouldRefreshAccessToken,
} from '../utils/sessionTokens.js';

const JWT_SECRET = process.env.JWT_SECRET;
const USER_CACHE_TTL_MS = Number(process.env.AUTH_USER_CACHE_TTL_MS || 30_000);
const PERMISSIONS_CACHE_TTL_MS = Number(process.env.PERMISSION_CACHE_TTL_MS || 60_000);
const userCache = new Map();
const permissionsCache = new Map();

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

const getAccessTokensFromRequest = (req) => {
  const authHeader = req.headers['authorization'];
  let headerToken = null;

  if (authHeader) {
    const [scheme, token] = authHeader.split(' ');
    if (scheme && token && scheme.toLowerCase() === 'bearer') {
      headerToken = token.trim();
    } else if (!authHeader.includes(' ')) {
      headerToken = authHeader.trim();
    }
  }

  const cookieHeader = req.headers?.cookie;
  const cookies = req.cookies ?? parseCookies(cookieHeader);

  return {
    headerToken,
    cookieToken: cookies?.token || cookies?.access_token || cookies?.auth_token || null,
  };
};

const normalizeRole = (role) => {
  if (!role) return role;
  if (role === 'admin') return 'client_admin';
  return role;
};

const TENANT_ROLES = new Set(['client_admin', 'school_owner', 'teacher', 'student']);

const isValidDecodedToken = (decoded) => {
  if (!decoded || typeof decoded !== 'object') return false;
  const userId = Number(decoded.userId);
  if (!Number.isInteger(userId) || userId <= 0) return false;

  if (decoded.clientId !== undefined && decoded.clientId !== null) {
    const clientId = Number(decoded.clientId);
    if (!Number.isInteger(clientId) || clientId <= 0) return false;
  }

  const role = normalizeRole(decoded.role);
  return typeof role === 'string' && role.length > 0;
};

const getCachedUser = (userId) => {
  const key = String(userId);
  const cached = userCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    userCache.delete(key);
    return null;
  }
  return cached.user;
};

const setCachedUser = (userId, user) => {
  const key = String(userId);
  userCache.set(key, {
    user,
    expiresAt: Date.now() + USER_CACHE_TTL_MS,
  });
};

const resolveAuthenticatedUser = async (decoded) => {
  const cachedUser = getCachedUser(decoded.userId);
  if (cachedUser) {
    return cachedUser;
  }

  const user = await dbQuery(
    `SELECT id, email, full_name, role, is_active, client_id, user_id
     FROM users
     WHERE id = $1 AND is_active = true`,
    [decoded.userId]
  );

  if (!user.rows[0]) {
    return null;
  }

  setCachedUser(decoded.userId, user.rows[0]);
  return user.rows[0];
};

export const authenticateAccessTokenValue = async (candidateToken) => {
  const decoded = jwt.verify(candidateToken, JWT_SECRET, getJwtVerifyOptions());
  if (!isValidDecodedToken(decoded)) {
    return null;
  }

  const user = await resolveAuthenticatedUser(decoded);
  if (!user) {
    return null;
  }

  if (normalizeRole(user.role) !== normalizeRole(decoded.role)) {
    return null;
  }

  if ((user.client_id ?? null) !== (decoded.clientId ?? null)) {
    return null;
  }

  return { decoded, user };
};

const getCachedPermissions = (userId, role, clientId) => {
  const key = `${userId}:${role}:${clientId ?? 'global'}`;
  const cached = permissionsCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    permissionsCache.delete(key);
    return null;
  }
  return cached.permissions;
};

const setCachedPermissions = (userId, role, clientId, permissions) => {
  const key = `${userId}:${role}:${clientId ?? 'global'}`;
  permissionsCache.set(key, {
    permissions,
    expiresAt: Date.now() + PERMISSIONS_CACHE_TTL_MS,
  });
};

export const invalidatePermissionCacheForUser = (userId) => {
  const userKeyPrefix = `${userId}:`;
  for (const key of permissionsCache.keys()) {
    if (key.startsWith(userKeyPrefix)) {
      permissionsCache.delete(key);
    }
  }
};

export const invalidatePermissionCacheForRoleClient = (role, clientId) => {
  const normalizedRole = normalizeRole(role);
  const normalizedClientId = clientId ?? 'global';

  for (const key of permissionsCache.keys()) {
    const [, cachedRole, cachedClientId] = key.split(':');
    if (cachedRole === normalizedRole && cachedClientId === String(normalizedClientId)) {
      permissionsCache.delete(key);
    }
  }
};

export const authenticateToken = async (req, res, next) => {
  const { headerToken, cookieToken } = getAccessTokensFromRequest(req);
  const refreshToken = getRefreshTokenFromRequest(req);

  if (!headerToken && !cookieToken && !refreshToken) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const candidateTokens = [];
  if (headerToken) candidateTokens.push(headerToken);
  if (cookieToken && cookieToken !== headerToken) candidateTokens.push(cookieToken);

  let authError = null;

  for (const candidateToken of candidateTokens) {
    try {
      const session = await authenticateAccessTokenValue(candidateToken);
      if (!session) {
        authError = { error: 'Invalid token', code: 'TOKEN_INVALID' };
        continue;
      }

      req.auth = session.decoded;
      req.user = session.user;

      if (refreshToken && shouldRefreshAccessToken(session.decoded)) {
        try {
          const refreshedSession = await rotateRefreshSession({ refreshToken, req, res });
          if (refreshedSession) {
            req.auth = refreshedSession.decoded;
            req.user = refreshedSession.user;
            setCachedUser(refreshedSession.user.id, refreshedSession.user);
          }
        } catch (refreshError) {
          console.error('Silent refresh error:', refreshError);
        }
      }

      return next();
    } catch (err) {
      if (!authError && err?.name === 'TokenExpiredError') {
        authError = { error: 'Token expired', code: 'TOKEN_EXPIRED' };
      } else if (!authError && err?.name === 'JsonWebTokenError') {
        authError = { error: 'Invalid token', code: 'TOKEN_INVALID' };
      }
    }
  }

  if (refreshToken) {
    try {
      const refreshedSession = await rotateRefreshSession({ refreshToken, req, res });
      if (refreshedSession) {
        req.auth = refreshedSession.decoded;
        req.user = refreshedSession.user;
        setCachedUser(refreshedSession.user.id, refreshedSession.user);
        return next();
      }
      clearAuthCookies(res);
    } catch (refreshError) {
      console.error('Silent refresh error:', refreshError);
    }
  }

  if (authError?.code === 'TOKEN_EXPIRED') {
    return res.status(401).json(authError);
  }
  if (authError?.code === 'TOKEN_INVALID') {
    return res.status(401).json(authError);
  }
  return res.status(401).json({ error: 'Invalid or expired token', code: 'TOKEN_INVALID' });
};

export const requireRole = (roles) => {
  const roleList = Array.isArray(roles) ? roles : [roles];

  const normalizedRoles = roleList.map(normalizeRole).filter(Boolean);

  return (req, res, next) => {
    const userRole = normalizeRole(req.user?.role);

    if (!userRole) return res.status(401).json({ error: 'Unauthorized' });
    if (normalizedRoles.length === 0) return res.status(500).json({ error: 'Role requirements not configured' });
    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

export const attachClientContext = (req, res, next) => {
  const claimClientId = req.auth?.clientId ?? req.auth?.client_id;
  const userClientId = req.user?.client_id ?? null;

  req.clientId = claimClientId ?? userClientId ?? null;
  next();
};

export const loadPermissions = async (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (!role) return res.status(401).json({ error: 'Unauthorized' });

  const clientId = req.clientId ?? null;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const cachedPermissions = getCachedPermissions(userId, role, clientId);
    if (cachedPermissions) {
      req.permissions = cachedPermissions;
      return next();
    }

    const isTenantRole = TENANT_ROLES.has(role);
    const permissionsQuery = isTenantRole
      ? `SELECT permission, granted, client_id
         FROM role_permissions
         WHERE role = $1 AND client_id = $2
         ORDER BY client_id NULLS LAST`
      : `SELECT permission, granted, client_id
         FROM role_permissions
         WHERE role = $1 AND (client_id = $2 OR client_id IS NULL)
         ORDER BY client_id NULLS LAST`;

    const result = await dbQuery(permissionsQuery, [role, clientId]);

    const permissions = new Map();
    for (const row of result.rows) {
      if (!permissions.has(row.permission)) {
        permissions.set(row.permission, row.granted === true);
      }
    }

    const overrides = await dbQuery(
      `SELECT permission, granted
       FROM user_permissions
       WHERE user_id = $1`,
      [userId]
    );
    for (const row of overrides.rows) {
      permissions.set(row.permission, row.granted === true);
    }

    setCachedPermissions(userId, role, clientId, permissions);
    req.permissions = permissions;
    next();
  } catch (err) {
    console.error('Failed to load permissions:', err);
    res.status(500).json({ error: 'Failed to load permissions' });
  }
};

export const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!permission) return res.status(500).json({ error: 'Permission not configured' });
    if (req.user?.role === 'super_admin') return next();

    const permissions = req.permissions;
    if (!permissions) return res.status(500).json({ error: 'Permissions not loaded' });

    let granted = false;
    if (permissions instanceof Map) {
      granted = permissions.get(permission) === true;
    } else if (permissions instanceof Set) {
      granted = permissions.has(permission);
    } else if (Array.isArray(permissions)) {
      granted = permissions.includes(permission);
    }

    if (!granted) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const checkAnyPermission = (permissionsToCheck) => {
  const permissionList = Array.isArray(permissionsToCheck) ? permissionsToCheck : [permissionsToCheck];

  return (req, res, next) => {
    if (permissionList.length === 0 || permissionList.some((permission) => !permission)) {
      return res.status(500).json({ error: 'Permission not configured' });
    }
    if (req.user?.role === 'super_admin') return next();

    const permissions = req.permissions;
    if (!permissions) return res.status(500).json({ error: 'Permissions not loaded' });

    const granted = permissionList.some((permission) => {
      if (permissions instanceof Map) return permissions.get(permission) === true;
      if (permissions instanceof Set) return permissions.has(permission);
      if (Array.isArray(permissions)) return permissions.includes(permission);
      return false;
    });

    if (!granted) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
