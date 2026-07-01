import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type TokenType = 'access' | 'refresh';

interface TokenPayload {
  sub: string;
  type: TokenType;
  iat?: number;
  exp?: number;
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '30d';

/**
 * Returns the expiry duration in seconds for the given token type.
 */
export function getTokenExpirySeconds(type: TokenType): number {
  return type === 'access' ? 15 * 60 : 30 * 24 * 60 * 60;
}

/**
 * Signs a new access token for the given user ID.
 */
export function signAccessToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'access' } as TokenPayload,
    env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Signs a new refresh token for the given user ID.
 */
export function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh' } as TokenPayload,
    env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Verifies a token and returns the payload.
 * Throws a JWT error if invalid, expired, or wrong type.
 */
export function verifyToken(token: string, expectedType: TokenType): TokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

  if (payload.type !== expectedType) {
    throw Object.assign(
      new Error(`Token type mismatch: expected '${expectedType}', got '${payload.type}'`),
      { statusCode: 401 }
    );
  }

  return payload;
}
