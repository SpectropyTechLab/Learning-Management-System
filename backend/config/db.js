// backend/config/db.js
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: parseInteger(process.env.PG_POOL_MAX, 10),
  min: parseInteger(process.env.PG_POOL_MIN, 0),
  idleTimeoutMillis: parseInteger(process.env.PG_IDLE_TIMEOUT_MS, 10000),
  connectionTimeoutMillis: parseInteger(process.env.PG_CONNECTION_TIMEOUT_MS, 15000),
  maxUses: parseInteger(process.env.PG_MAX_USES, 7500),
  allowExitOnIdle: parseBoolean(process.env.PG_ALLOW_EXIT_ON_IDLE, false),
  keepAlive: parseBoolean(process.env.PG_KEEP_ALIVE, true),
  keepAliveInitialDelayMillis: parseInteger(process.env.PG_KEEP_ALIVE_DELAY_MS, 10000),
});

pool.on('error', (error) => {
  console.error('Postgres pool error:', error);
});

export default pool;
