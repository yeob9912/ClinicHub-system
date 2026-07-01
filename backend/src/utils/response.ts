import { Response } from 'express';
import { ApiResponse, PaginationMeta, ValidationError } from '../types';

// ─── Success Responses ────────────────────────────────────────────────────────

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operation successful',
  statusCode = 200
): Response {
  const body: ApiResponse<T> = { success: true, data, message };
  return res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T, message = 'Resource created'): Response {
  return sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message = 'Operation successful'
): Response {
  const body: ApiResponse<T[]> = { success: true, data, message, meta };
  return res.status(200).json(body);
}

// ─── Error Responses ──────────────────────────────────────────────────────────

export function sendError(
  res: Response,
  statusCode: number,
  error: string,
  message: string,
  details?: ValidationError[]
): Response {
  const body: ApiResponse<null> = { success: false, data: null, error, message, details };
  return res.status(statusCode).json(body);
}

export function sendBadRequest(res: Response, message: string, details?: ValidationError[]): Response {
  return sendError(res, 400, 'BAD_REQUEST', message, details);
}

export function sendUnauthorized(res: Response, message = 'Authentication required'): Response {
  return sendError(res, 401, 'UNAUTHORIZED', message);
}

export function sendForbidden(res: Response, message = 'Insufficient permissions'): Response {
  return sendError(res, 403, 'FORBIDDEN', message);
}

export function sendNotFound(res: Response, resource = 'Resource'): Response {
  return sendError(res, 404, 'NOT_FOUND', `${resource} not found`);
}

export function sendConflict(res: Response, message: string): Response {
  return sendError(res, 409, 'CONFLICT', message);
}

export function sendUnprocessable(res: Response, message: string): Response {
  return sendError(res, 422, 'UNPROCESSABLE_ENTITY', message);
}

export function sendInternalError(res: Response, message = 'Internal server error'): Response {
  return sendError(res, 500, 'INTERNAL_ERROR', message);
}
