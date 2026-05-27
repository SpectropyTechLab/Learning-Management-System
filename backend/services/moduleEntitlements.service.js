import { AppError, handleServiceError } from '../utils/errors.js';
import * as repo from '../repositories/moduleEntitlements.repository.js';

export const QUESTION_BANK_FEATURE_KEY = 'question_bank';
export const EXAMS_FEATURE_KEY = 'exams';

const parseRequiredInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new AppError(`${fieldName} is required`, 400);
  }
  return parsed;
};

const parseRequiredString = (value, fieldName) => {
  const parsed = String(value ?? '').trim();
  if (!parsed) {
    throw new AppError(`${fieldName} is required`, 400);
  }
  return parsed;
};

const parseEnum = (value, fieldName, allowedValues) => {
  const parsed = String(value ?? '').trim();
  if (!allowedValues.includes(parsed)) {
    throw new AppError(`${fieldName} must be one of ${allowedValues.join(', ')}`, 400);
  }
  return parsed;
};

const parseOptionalBoolean = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes'].includes(normalized)) return true;
  if (['0', 'false', 'no'].includes(normalized)) return false;
  throw new AppError('enabled must be a boolean', 400);
};

const getFeatureKey = (moduleKey) => {
  if (moduleKey === 'question_bank') return QUESTION_BANK_FEATURE_KEY;
  if (moduleKey === 'exams') return EXAMS_FEATURE_KEY;
  throw new AppError(`Unsupported entitlement module "${moduleKey}"`, 400);
};

const isPlatformAdmin = (role) => role === 'super_admin' || role === 'content_authorizer';

const resolveClientIdForRequest = (req, sourceClientId) => {
  if (isPlatformAdmin(req.user?.role)) {
    return sourceClientId ? parseRequiredInt(sourceClientId, 'client_id') : null;
  }
  const clientId = req.clientId || req.user?.client_id;
  if (!clientId) {
    throw new AppError('client_id is required', 400);
  }
  return Number(clientId);
};

export const createEntitlementHandlers = (moduleKey) => ({
  list: async (req, res) => {
    try {
      const clientId = req.query?.client_id ? parseRequiredInt(req.query.client_id, 'client_id') : null;
      const result = await repo.listModuleEntitlements(moduleKey, { clientId });
      res.json(result.rows);
    } catch (err) {
      handleServiceError(res, err, `Failed to load ${moduleKey} entitlements`);
    }
  },

  create: async (req, res) => {
    try {
      const clientId = parseRequiredInt(req.body?.client_id, 'client_id');
      const entitlementType = parseEnum(req.body?.entitlement_type, 'entitlement_type', ['feature', 'program']);
      const featureKey = entitlementType === 'feature'
        ? parseRequiredString(req.body?.feature_key, 'feature_key')
        : null;
      const programId = entitlementType === 'program'
        ? parseRequiredInt(req.body?.program_id, 'program_id')
        : null;
      const enabled = parseOptionalBoolean(req.body?.enabled) ?? true;

      const result = await repo.insertModuleEntitlement(moduleKey, {
        clientId,
        entitlementType,
        featureKey,
        programId,
        enabled,
        assignedByUserId: req.user.id,
      });
      res.status(201).json(result.rows[0]);
    } catch (err) {
      handleServiceError(res, err, `Failed to create ${moduleKey} entitlement`);
    }
  },

  update: async (req, res) => {
    try {
      const id = parseRequiredInt(req.params?.id, 'id');
      const enabled = parseOptionalBoolean(req.body?.enabled);
      if (enabled === null) {
        throw new AppError('enabled is required', 400);
      }

      const result = await repo.updateModuleEntitlement(moduleKey, { id, enabled });
      if (!result.rows[0]) {
        throw new AppError('Entitlement not found', 404);
      }
      res.json(result.rows[0]);
    } catch (err) {
      handleServiceError(res, err, `Failed to update ${moduleKey} entitlement`);
    }
  },
});

export const ensureFeatureEntitledForModule = async (moduleKey, clientId, featureKey = getFeatureKey(moduleKey)) => {
  const result = await repo.fetchFeatureEntitlement(moduleKey, { clientId, featureKey });
  if (!result.rows[0]) {
    throw new AppError(`Client is not entitled to ${featureKey}`, 403);
  }
  return result.rows[0];
};

export const ensureProgramEntitledForModule = async (moduleKey, clientId, programId) => {
  if (!programId) {
    throw new AppError('program_id is required', 400);
  }
  const result = await repo.fetchProgramEntitlement(moduleKey, { clientId, programId });
  if (!result.rows[0]) {
    throw new AppError('Client is not entitled to this program', 403);
  }
  return result.rows[0];
};

export const getEnabledProgramIdsForModule = async (moduleKey, clientId) => {
  const featureKey = getFeatureKey(moduleKey);
  await ensureFeatureEntitledForModule(moduleKey, clientId, featureKey);
  const result = await repo.listEnabledProgramIds(moduleKey, { clientId });
  return result.rows
    .map((row) => Number(row.program_id))
    .filter((value) => Number.isInteger(value));
};

export const getEnabledProgramIdsIfFeatureEnabled = async (moduleKey, clientId) => {
  const featureKey = getFeatureKey(moduleKey);
  const featureResult = await repo.fetchFeatureEntitlement(moduleKey, { clientId, featureKey });
  if (!featureResult.rows[0]) {
    return [];
  }

  const result = await repo.listEnabledProgramIds(moduleKey, { clientId });
  return result.rows
    .map((row) => Number(row.program_id))
    .filter((value) => Number.isInteger(value));
};

export const buildFeatureEntitlementMiddleware = (moduleKey) => async (req, res, next) => {
  try {
    if (isPlatformAdmin(req.user?.role)) {
      return next();
    }
    const clientId = resolveClientIdForRequest(req);
    await ensureFeatureEntitledForModule(moduleKey, clientId);
    return next();
  } catch (err) {
    return handleServiceError(res, err, `Failed entitlement check for ${moduleKey}`);
  }
};
