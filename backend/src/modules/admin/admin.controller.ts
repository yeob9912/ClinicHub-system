import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { sendSuccess, sendCreated, sendError, sendUnauthorized } from '../../utils/response';

const adminService = new AdminService();

export const adminController = {
  // ─── Users ─────────────────────────────────────────────────────────────────

  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.listUsers(req.query as Record<string, string>);
      res.json({ success: true, ...result, message: 'Users retrieved' });
    } catch (err) {
      next(err);
    }
  },

  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const user = await adminService.updateUser(req.userId, req.params.id, req.body);
      sendSuccess(res, user, 'User updated');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 400) sendError(res, 400, 'BAD_REQUEST', e.message);
      else if (e.statusCode === 404) sendError(res, 404, 'NOT FOUND', e.message);
      else next(err);
    }
  },

  // ─── Pharmacies ────────────────────────────────────────────────────────────

  async listPharmacies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.listPharmacies(req.query as Record<string, string>);
      res.json({ success: true, ...result, message: 'Pharmacies retrieved' });
    } catch (err) {
      next(err);
    }
  },

  async approvePharmacy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const result = await adminService.approvePharmacy(req.userId, req.params.id);
      sendSuccess(res, result, 'Pharmacy approved');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else if (e.statusCode === 422) sendError(res, 422, 'UNPROCESSABLE_ENTITY', e.message);
      else next(err);
    }
  },

  async rejectPharmacy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.rejectPharmacy(req.params.id, req.body.reason);
      sendSuccess(res, result, 'Pharmacy rejected');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else if (e.statusCode === 422) sendError(res, 422, 'UNPROCESSABLE_ENTITY', e.message);
      else next(err);
    }
  },

  async suspendPharmacy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.suspendPharmacy(req.params.id, req.body.reason);
      sendSuccess(res, result, 'Pharmacy suspended');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else next(err);
    }
  },

  async getPharmacyInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.getPharmacyInventory(req.params.id);
      res.json({ success: true, ...result, message: 'Pharmacy inventory retrieved' });
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else next(err);
    }
  },

  async sendOwnerQuery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message } = req.body;
      if (!message || typeof message !== 'string' || message.trim().length < 5) {
        sendError(res, 400, 'BAD_REQUEST', 'message must be at least 5 characters');
        return;
      }
      const result = await adminService.sendOwnerQuery(req.params.id, message.trim());
      sendSuccess(res, result, 'Query sent to pharmacy owner');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else if (e.statusCode === 422) sendError(res, 422, 'UNPROCESSABLE_ENTITY', e.message);
      else next(err);
    }
  },

  // ─── Medicines ─────────────────────────────────────────────────────────────

  async listMedicines(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { is_active, page, limit } = req.query as Record<string, string>;
      const result = await adminService.listMedicines({
        is_active: is_active !== undefined ? is_active === 'true' : undefined,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
      res.json({ success: true, ...result, message: 'Medicines retrieved' });
    } catch (err) {
      next(err);
    }
  },

  async createMedicine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const medicine = await adminService.createMedicine(req.body);
      sendCreated(res, medicine, 'Medicine created');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 409) sendError(res, 409, 'CONFLICT', e.message);
      else next(err);
    }
  },

  async updateMedicine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const medicine = await adminService.updateMedicine(req.params.id, req.body);
      sendSuccess(res, medicine, 'Medicine updated');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else next(err);
    }
  },

  // ─── Stats & Activity ──────────────────────────────────────────────────────

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getStats();
      res.json({ success: true, data: stats, message: 'Stats retrieved' });
    } catch (err) {
      next(err);
    }
  },

  async getActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit, days } = req.query as Record<string, string>;
      const activity = await adminService.getActivity({
        limit: limit ? parseInt(limit) : 20,
        days: days ? parseInt(days) : 30,
      });
      res.json({ success: true, data: activity, message: 'Activity retrieved' });
    } catch (err) {
      next(err);
    }
  },

  async broadcastNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, body, audience } = req.body;
      if (!title || !body || !audience) {
        sendError(res, 400, 'BAD_REQUEST', 'title, body and audience are required');
        return;
      }
      if (!['users', 'staff', 'both'].includes(audience)) {
        sendError(res, 400, 'BAD_REQUEST', 'audience must be users, staff, or both');
        return;
      }
      const result = await adminService.broadcastNotification({ title, body, audience });
      sendSuccess(res, result, `Broadcast sent to ${result.sent} recipient(s)`);
    } catch (err) {
      next(err);
    }
  },

  async listBroadcasts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await adminService.getBroadcastHistory();
      res.json({ success: true, data: history, message: 'Broadcast history retrieved' });
    } catch (err) {
      next(err);
    }
  },
};

