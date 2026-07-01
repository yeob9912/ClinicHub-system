import { Request, Response, NextFunction } from 'express';
import { NotificationsService } from './notifications.service';
import { sendSuccess, sendCreated, sendNoContent, sendError, sendUnauthorized } from '../../utils/response';

const notificationsService = new NotificationsService();

export const notificationsController = {
  // ─── Watchlist ───────────────────────────────────────────────────────────

  async getWatchlist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const { page, limit } = req.query as Record<string, string>;
      const result = await notificationsService.getWatchlist(req.userId, {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
      res.json({ success: true, ...result, message: 'Watchlist retrieved' });
    } catch (err) {
      next(err);
    }
  },

  async addToWatchlist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const item = await notificationsService.addToWatchlist(req.userId, req.body);
      sendCreated(res, item, 'Added to watchlist');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 409) sendError(res, 409, 'CONFLICT', e.message);
      else if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else next(err);
    }
  },

  async removeFromWatchlist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      await notificationsService.removeFromWatchlist(req.userId, req.params.id);
      sendNoContent(res);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else next(err);
    }
  },

  // ─── Notifications ───────────────────────────────────────────────────────

  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const { is_read, type, page, limit } = req.query as Record<string, string>;
      const result = await notificationsService.getNotifications(req.userId, {
        is_read: is_read !== undefined ? is_read === 'true' : undefined,
        type,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
      res.json({ success: true, ...result, message: 'Notifications retrieved' });
    } catch (err) {
      next(err);
    }
  },

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const result = await notificationsService.markAsRead(req.userId, req.params.id);
      sendSuccess(res, result, 'Notification marked as read');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else next(err);
    }
  },

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const result = await notificationsService.markAllAsRead(req.userId);
      sendSuccess(res, result, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  },

  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      await notificationsService.deleteNotification(req.userId, req.params.id);
      sendNoContent(res);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else next(err);
    }
  },
};
