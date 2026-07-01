import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { Sentry } from '../config/sentry';
import { env } from '../config/env';

export function errorHandler(
  err: Error & { status?: number; code?: string },
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string;

  logger.error({ err, requestId, path: req.path, method: req.method }, 'Unhandled error');

  if (Sentry) {
    Sentry.captureException(err, { tags: { requestId } });
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    res.status(409).json({
      success: false,
      data: null,
      error: 'DUPLICATE_ENTRY',
      message: 'Resource already exists',
      requestId,
    });
    return;
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    res.status(400).json({
      success: false,
      data: null,
      error: 'INVALID_REFERENCE',
      message: 'Referenced resource not found',
      requestId,
    });
    return;
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      success: false,
      data: null,
      error: 'FILE_TOO_LARGE',
      message: 'Uploaded file exceeds the size limit',
      requestId,
    });
    return;
  }

  const statusCode = err.status || 500;
  const message =
    env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    data: null,
    error: err.code || 'INTERNAL_ERROR',
    message,
    requestId,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    data: null,
    error: 'ROUTE_NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}
