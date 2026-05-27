import { AppError } from '../utils/errors.js';

export const parseRequiredInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} must be a positive integer`, 400);
  }
  return parsed;
};

export const parseOptionalInt = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  return parseRequiredInt(value, fieldName);
};

export const parseOptionalString = (value) => {
  if (value === undefined || value === null) return null;
  const next = String(value).trim();
  return next.length > 0 ? next : null;
};

export const parseRequiredString = (value, fieldName) => {
  const next = parseOptionalString(value);
  if (!next) {
    throw new AppError(`${fieldName} is required`, 400);
  }
  return next;
};

export const parseOptionalBoolean = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  throw new AppError('Invalid boolean value', 400);
};

export const parseDateString = (value, fieldName, { required = false } = {}) => {
  if (value === undefined || value === null || value === '') {
    if (required) throw new AppError(`${fieldName} is required`, 400);
    return null;
  }

  const next = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) {
    throw new AppError(`${fieldName} must be in YYYY-MM-DD format`, 400);
  }
  return next;
};

export const parseJsonArrayField = (value, fieldName, { required = false } = {}) => {
  if (value === undefined || value === null || value === '') {
    if (required) throw new AppError(`${fieldName} is required`, 400);
    return [];
  }

  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(String(value));
    if (!Array.isArray(parsed)) {
      throw new Error('not an array');
    }
    return parsed;
  } catch {
    throw new AppError(`${fieldName} must be a JSON array`, 400);
  }
};

export const parseJsonObjectField = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(String(value));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    return parsed;
  } catch {
    throw new AppError(`${fieldName} must be a JSON object`, 400);
  }
};

export const parseEnum = (value, fieldName, validValues, fallback = null) => {
  const next = parseOptionalString(value);
  if (!next) {
    if (fallback !== null) return fallback;
    throw new AppError(`${fieldName} is required`, 400);
  }
  if (!validValues.includes(next)) {
    throw new AppError(`${fieldName} is invalid`, 400);
  }
  return next;
};
