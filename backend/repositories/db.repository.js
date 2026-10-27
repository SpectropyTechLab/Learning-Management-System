// backend/repositories/db.repository.js
import pool from '../config/db.js';

const isConnectionTerminationError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === '57P01' ||
    error?.code === '57P02' ||
    message.includes('connection terminated unexpectedly') ||
    message.includes('connection terminated due to connection timeout') ||
    message.includes('timeout exceeded when trying to connect')
  );
};

export const query = async (text, params) => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await pool.query(text, params);
    } catch (error) {
      if (attempt === 1 || !isConnectionTerminationError(error)) {
        throw error;
      }
    }
  }

  throw new Error('Database query failed');
};

export const getClient = () => pool.connect();
