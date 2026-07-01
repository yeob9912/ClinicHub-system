import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// ─── Development bypass ───────────────────────────────────────────────────────
// Skip ALL rate limiting in development so 429 errors never appear locally.
const isDev = (): boolean => env.NODE_ENV === 'development';

const defaultRateLimitHandler = (
  _req: import('express').Request,
  res: import('express').Response
): void => {
  res.status(429).json({
    success: false,
    data: null,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please slow down.',
  });
};

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: import('express').Request): boolean => {
    if (isDev()) return true;
    const path = req.originalUrl || req.path || '';
    return (
      path.includes('/calls/active') ||
      path.includes('/pharmacies') ||
      path.includes('/medicines/search')
    );
  },
  handler: defaultRateLimitHandler,
});

// ─── Auth Rate Limiters ───────────────────────────────────────────────────────
export const authLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev(),
  handler: defaultRateLimitHandler,
});

export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev(),
  keyGenerator: (req) => req.body?.email || req.ip || 'unknown',
  handler: defaultRateLimitHandler,
});

// ─── Search Rate Limiters ─────────────────────────────────────────────────────
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev(),
  handler: defaultRateLimitHandler,
});

// ─── Inventory Rate Limiter ───────────────────────────────────────────────────
export const inventoryRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev(),
  handler: defaultRateLimitHandler,
});

// ─── Public Endpoint Rate Limiter ─────────────────────────────────────────────
export const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev(),
  handler: defaultRateLimitHandler,
});

