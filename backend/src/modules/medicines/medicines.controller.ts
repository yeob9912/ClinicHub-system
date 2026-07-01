import { Request, Response, NextFunction } from 'express';
import { MedicinesService } from './medicines.service';
import { sendSuccess, sendError } from '../../utils/response';

const medicinesService = new MedicinesService();

export const medicinesController = {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, category_id, requires_rx, page, limit } = req.query as Record<string, string>;
      const result = await medicinesService.search({
        q,
        category_id,
        requires_rx: requires_rx !== undefined ? requires_rx === 'true' : undefined,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        authId: req.userId,
      });
      res.json({ success: true, ...result, message: 'Search results' });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category_id, requires_rx, sort, order, page, limit } = req.query as Record<string, string>;
      const result = await medicinesService.list({
        category_id,
        requires_rx: requires_rx !== undefined ? requires_rx === 'true' : undefined,
        sort,
        order: order as 'asc' | 'desc',
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
      res.json({ success: true, ...result, message: 'Medicines retrieved' });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const medicine = await medicinesService.getById(req.params.id);
      sendSuccess(res, medicine);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else next(err);
    }
  },

  async getAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng, radius, sort_by, in_stock_only, page, limit } = req.query as Record<string, string>;

      const result = await medicinesService.getAvailability({
        id: req.params.id,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
        radius: radius ? parseFloat(radius) : undefined,
        sort_by,
        in_stock_only: in_stock_only === 'true',
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });

      res.json({ success: true, ...result, message: 'Availability data retrieved' });
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else next(err);
    }
  },

  async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const includeCount = req.query.include_count === 'true';
      const data = await medicinesService.getCategories(includeCount);
      sendSuccess(res, data, 'Categories retrieved');
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const medicine = await medicinesService.create(req.body, req.userId);
      sendSuccess(res, medicine, 'Medicine created');
    } catch (err) {
      next(err);
    }
  },
};
