import { query as dbQuery } from '../repositories/db.repository.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import {
  applyAuthCookies,
  clearAuthCookies,
  createRefreshToken,
  getRefreshTokenFromRequest,
  hashToken,
  issueAccessToken,
  rotateRefreshSession,
  storeRefreshToken,
} from '../utils/sessionTokens.js';
import { enrichAuthUser } from './authUser.service.js';

const VALID_ROLES = [
  'super_admin',
  'content_authorizer',
  'client_admin',
  'school_owner',
  'teacher',
  'student',
];

const normalizeRole = (role) => {
  if (!role) return role;
  if (role === 'admin') return 'client_admin'; // backward compatibility
  return role;
};

const parseNullableInt = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return parsed;
};

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? null : trimmed;
};

// ✅ Updated registration: allow role, but restrict to safe ones
export const register = async (req, res) => {
  return res.status(403).json({ error: 'Self-registration is disabled. Contact an admin.' });
  const { email, full_name, password } = req.body;
  const role = normalizeRole(req.body.role);

  if (!email || !full_name || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // 🔒 Only allow self-registration for these roles
  if (!SELF_REGISTER_ROLES.includes(role)) {
    return res.status(400).json({ error: 'This role cannot be registered publicly.' });
  }

  let clientId = null;
  let userId = null;
  try {
    clientId = parseNullableInt(req.body.client_id, 'client_id');
    userId = normalizeOptionalString(req.body.user_id);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    const hashed = await hashPassword(password);
    const result = await dbQuery(
      `INSERT INTO users (email, full_name, password_hash, role, client_id, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role, client_id, user_id`,
      [email, full_name, hashed, role, clientId, userId]
    );

    const accessToken = issueAccessToken(result.rows[0]);
    const refreshToken = createRefreshToken();
    const tokenHash = hashToken(refreshToken);

    await storeRefreshToken(null, result.rows[0].id, tokenHash, req);
    applyAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({ token: accessToken, user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ✅ Login (supports all roles)
export const login = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const userQueryResult = await dbQuery(
      'SELECT id, email, full_name, role, client_id, user_id, password_hash FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (userQueryResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userQueryResult.rows[0];
    const isValid = await comparePassword(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await dbQuery('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const accessToken = issueAccessToken(user);
    const refreshToken = createRefreshToken();
    const tokenHash = hashToken(refreshToken);

    await storeRefreshToken(null, user.id, tokenHash, req);
    applyAuthCookies(res, accessToken, refreshToken);
    const safeUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      client_id: user.client_id,
      user_id: user.user_id,
    };

    res.json({ token: accessToken, user: await enrichAuthUser(safeUser) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }






};



// ✅ Super Admin registers admins (client_admin by default)
export const registerAdmin = async (req, res) => {
  // Super Admin check is done in middleware (see Step 2)
  const { email, full_name, password } = req.body;
  const role = normalizeRole(req.body.role) || 'client_admin';

  if (!email || !full_name || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  let clientId = null;
  let userId = null;
  try {
    clientId = parseNullableInt(req.body.client_id, 'client_id');
    userId = normalizeOptionalString(req.body.user_id);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    const hashed = await hashPassword(password);
    const result = await dbQuery(
      `INSERT INTO users (email, full_name, password_hash, role, client_id, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role, client_id, user_id`,
      [email, full_name, hashed, role, clientId, userId]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Admin registration failed' });
  }
};

export const refreshToken = async (req, res) => {
  const token = getRefreshTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Refresh token required' });
  }
  try {
    const refreshedSession = await rotateRefreshSession({ refreshToken: token, req, res });
    if (!refreshedSession) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    res.json({ token: refreshedSession.accessToken, user: await enrichAuthUser(refreshedSession.user) });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

export const logout = async (req, res) => {
  const token = getRefreshTokenFromRequest(req);
  if (!token) {
    clearAuthCookies(res);
    return res.status(204).send();
  }

  try {
    const tokenHash = hashToken(token);
    await dbQuery(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash]
    );
  } catch (err) {
    console.error('Logout error:', err);
  }

  clearAuthCookies(res);
  return res.status(204).send();
};



