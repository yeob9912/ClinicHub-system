import { Request, Response, NextFunction } from 'express';
import { PharmaciesService } from './pharmacies.service';
import { sendSuccess, sendCreated, sendError, sendUnauthorized } from '../../utils/response';

const pharmaciesService = new PharmaciesService();

export const pharmaciesController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await pharmaciesService.list(req.query);
      res.json({ success: true, ...result, message: 'Pharmacies retrieved' });
    } catch (err) {
      next(err);
    }
  },

  async getNearby(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng, radius, city, page, limit } = req.query as Record<string, string>;
      const result = await pharmaciesService.getNearby({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius: radius ? parseFloat(radius) : undefined,
        city,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
      res.json({ success: true, ...result, message: 'Pharmacies retrieved' });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pharmacy = await pharmaciesService.getById(req.params.id, req.userId);
      sendSuccess(res, pharmacy);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const pharmacy = await pharmaciesService.create(req.userId, req.body);
      sendCreated(res, pharmacy, 'Pharmacy registered and pending approval');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 403) sendError(res, 403, 'FORBIDDEN', e.message);
      else if (e.statusCode === 409) sendError(res, 409, 'CONFLICT', e.message);
      else next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const pharmacy = await pharmaciesService.update(req.userId, req.params.id, req.body);
      sendSuccess(res, pharmacy, 'Pharmacy updated');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 403) sendError(res, 403, 'FORBIDDEN', e.message);
      else if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else next(err);
    }
  },

  // ✅ NEW: SETTINGS UPDATE (THIS FIXES YOUR ISSUE)
  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        sendUnauthorized(res);
        return;
      }

      const updated = await pharmaciesService.updateSettings(
        req.userId,
        req.params.id,
        req.body
      );

      sendSuccess(res, updated, 'Settings updated successfully');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else if (e.statusCode === 403) sendError(res, 403, 'FORBIDDEN', e.message);
      else next(err);
    }
  },

  async uploadLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      if (!req.file) { sendError(res, 400, 'BAD_REQUEST', 'No file uploaded'); return; }

      const result = await pharmaciesService.uploadLogo(
        req.userId,
        req.params.id,
        req.file
      );

      sendSuccess(res, result, 'Logo uploaded');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 403) sendError(res, 403, 'FORBIDDEN', e.message);
      else next(err);
    }
  },

  async ratePharmacy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const { rating } = req.body as { rating: number };
      if (!rating || rating < 1 || rating > 5) {
        sendError(res, 400, 'BAD_REQUEST', 'Rating must be between 1 and 5');
        return;
      }
      const result = await pharmaciesService.ratePharmacy(req.params.id, req.userId, rating);
      sendSuccess(res, result, 'Rating submitted successfully');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else next(err);
    }
  },

  async createAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const result = await pharmaciesService.createAnnouncement(req.userId, req.params.id, req.body);
      sendCreated(res, result, 'Announcement published successfully');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else if (e.statusCode === 403) sendError(res, 403, 'FORBIDDEN', e.message);
      else next(err);
    }
  },

  async updateAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const result = await pharmaciesService.updateAnnouncement(req.userId, req.params.id, req.params.announcementId, req.body);
      sendSuccess(res, result, 'Announcement updated successfully');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else if (e.statusCode === 403) sendError(res, 403, 'FORBIDDEN', e.message);
      else next(err);
    }
  },

  async deleteAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      await pharmaciesService.deleteAnnouncement(req.userId, req.params.id, req.params.announcementId);
      sendSuccess(res, null, 'Announcement deleted successfully');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else if (e.statusCode === 403) sendError(res, 403, 'FORBIDDEN', e.message);
      else next(err);
    }
  },
};