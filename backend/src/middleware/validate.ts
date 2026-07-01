import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { sendError } from '../utils/response';

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const zodError = result.error as ZodError;
      const details = zodError.errors.map((e) => ({
        field: e.path.join('.').replace(/^body\.|^query\.|^params\./, ''),
        message: e.message,
      }));

      sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', details);
      return;
    }

    const validated = result.data as {
      body?: Record<string, unknown>;
      params?: Record<string, unknown>;
      query?: Record<string, unknown>;
    };

    req.validated = validated;

    // Propagate Zod-transformed body back to req.body so controllers get:
    // - .default() values applied
    // - .transform() coercions applied (e.g. z.boolean().default(true))
    // - unknown fields stripped
    if (validated.body !== undefined) {
      req.body = validated.body;
    }

    next();
  };
}
