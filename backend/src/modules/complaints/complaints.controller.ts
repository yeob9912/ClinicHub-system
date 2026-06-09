import { Request, Response, NextFunction } from 'express';
import { ComplaintsService } from './complaints.service';
import { sendSuccess, sendCreated, sendError, sendUnauthorized } from '../../utils/response';

const complaintsService = new ComplaintsService();

export const complaintsController = {
  /** POST /complaints — user submits */
  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const complaint = await complaintsService.submit(req.userId, req.body);
      sendCreated(res, complaint, 'Complaint submitted successfully');
    } catch (err) {
      next(err);
    }
  },

  /** GET /complaints/me — user's own complaints */
  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const { page, limit } = req.query as Record<string, string>;
      const result = await complaintsService.listForUser(req.userId, {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
      res.json({ success: true, ...result, message: 'Complaints retrieved' });
    } catch (err) {
      next(err);
    }
  },

  /** GET /admin/complaints — admin list all */
  async listAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, priority, page, limit } = req.query as Record<string, string>;
      const result = await complaintsService.listAll({
        status,
        priority,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
      res.json({ success: true, ...result, message: 'Complaints retrieved' });
    } catch (err) {
      next(err);
    }
  },

  /** POST /admin/complaints/:id/respond — admin send text + update status */
  async respond(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const result = await complaintsService.respond(req.userId, req.params.id, req.body);
      sendSuccess(res, result, 'Response sent');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else next(err);
    }
  },

  /** PATCH /admin/complaints/:id/status — quick approve/close */
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const { status, priority } = req.body;
      const result = await complaintsService.updateStatus(req.userId, req.params.id, status, priority);
      sendSuccess(res, result, 'Status updated');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else next(err);
    }
  },
};
