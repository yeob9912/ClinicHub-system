import { Request, Response, NextFunction } from 'express';
import { sendUnauthorized } from '../utils/response';
import { logger } from '../config/logger';
import { verifyToken } from '../utils/jwt';
import { UserModel } from '../models/User';

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendUnauthorized(res, 'Missing or malformed Authorization header');
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    sendUnauthorized(res, 'Missing token');
    return;
  }

  try {
    const payload = verifyToken(token, 'access');
    const user = await UserModel.findById(payload.sub);

    if (!user || !user.is_active) {
      sendUnauthorized(res, 'Invalid or expired token');
      return;
    }

    req.userId = user._id.toString();
    next();
  } catch (err) {
    logger.error({ err }, 'authentication error');
    sendUnauthorized(res, 'verification failed');
  }
}

export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const payload = verifyToken(token, 'access');
    const user = await UserModel.findById(payload.sub);

    if (user && user.is_active) {
      req.userId = user._id.toString();
    }
    next();
  } catch (err) {
    // Treat invalid tokens as unauthenticated instead of failing public routes
    next();
  }
}
