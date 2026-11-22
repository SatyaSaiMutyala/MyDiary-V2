import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

/** Absolute path of Backend/. */
export const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

dotenv.config({ path: path.join(BACKEND_ROOT, '.env'), quiet: true });

const env = process.env;
const nodeEnv = env.NODE_ENV ?? 'development';
const isProd = nodeEnv === 'production';

/** @param {string} name @param {string} fallback */
function str(name, fallback) {
  const v = env[name];
  return v !== undefined && v.trim() !== '' ? v.trim() : fallback;
}

/** Required in production; a fixed dev value otherwise. @param {string} name @param {string} devFallback */
function secret(name, devFallback) {
  const v = env[name]?.trim();
  if (v) return v;
  if (isProd) throw new Error(`${name} must be set in production`);
  return devFallback;
}

/** Comma-separated list of allowed browser origins, or '*' for any (dev). @returns {string[] | '*'} */
function corsOrigins() {
  const raw = env.CORS_ORIGIN?.trim();
  if (!raw) return ['http://localhost:5173', 'http://127.0.0.1:5173'];
  if (raw === '*') return '*';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  nodeEnv,
  isProd,
  isTest: nodeEnv === 'test',
  appName: 'MyDiary V2 API',
  port: Number.parseInt(str('PORT', '4000'), 10),
  /** Interface to listen on. Production: 127.0.0.1 (behind nginx). Dev: all interfaces. */
  host: env.HOST?.trim() || (isProd ? '127.0.0.1' : undefined),
  /** Empty = start the embedded dev database (mongodb-memory-server) instead of connecting to a real one. */
  mongodbUri: env.MONGODB_URI?.trim() || '',
  embeddedMongoPort: Number.parseInt(str('EMBEDDED_MONGO_PORT', '27018'), 10),
  embeddedMongoDbPath: path.join(BACKEND_ROOT, '.data', 'mongo'),
  jwtSecret: secret('JWT_SECRET', 'mydiary-dev-jwt-secret'),
  jwtExpiresIn: str('JWT_EXPIRES', '7d'),
  corsOrigin: corsOrigins(),
  /** First admin, created at boot when the users collection is empty. */
  admin: {
    name: str('ADMIN_NAME', 'Venkata Cherukuri'),
    email: str('ADMIN_EMAIL', 'venkata.cherukuri@trustlab.co.in').toLowerCase(),
    password: str('ADMIN_PASSWORD', 'mydiary123'),
  },
  /** Executive Assistant who coordinates the CMD's calendar: meeting requests addressed to ADMIN_NAME are routed here. */
  eaName: str('EA_NAME', 'Pallavi Elisetti'),
  /** Password given to every roster user created by `npm run seed`. */
  seedPassword: str('SEED_PASSWORD', 'mydiary123'),
};
