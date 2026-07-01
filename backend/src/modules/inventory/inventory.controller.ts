import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service';
import { sendSuccess, sendCreated, sendNoContent, sendError, sendUnauthorized } from '../../utils/response';

const inventoryService = new InventoryService();

export const inventoryController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {

      // Read raw strings from req.query — the service handles 'true'/'false' conversion
      const { in_stock, low_stock, category_id, search, sort, order, page, limit } =
        req.query as Record<string, string>;

      const result = await inventoryService.list(req.userId, req.params.pharmacy_id, {
        in_stock,      // raw string: 'true' | 'false' | undefined — service converts
        low_stock,     // raw string: 'true' | 'false' | undefined — service converts
        category_id,
        search,
        sort,
        order,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      res.json({ success: true, ...result, message: 'Inventory retrieved' });
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 403) sendError(res, 403, 'FORBIDDEN', e.message);
      else if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else next(err);
    }
  },

  async add(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const item = await inventoryService.add(req.userId, req.params.pharmacy_id, req.body);
      sendCreated(res, item, 'Inventory item added');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 403) sendError(res, 403, 'FORBIDDEN', e.message);
      else if (e.statusCode === 409) sendError(res, 409, 'CONFLICT', e.message);
      else if (e.statusCode === 422) sendError(res, 422, 'UNPROCESSABLE_ENTITY', e.message);
      else if (e.statusCode === 400) sendError(res, 400, 'BAD_REQUEST', e.message);
      else next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const item = await inventoryService.update(
        req.userId,
        req.params.pharmacy_id,
        req.params.inventory_id,
        req.body
      );
      sendSuccess(res, item, 'Inventory item updated');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 403) sendError(res, 403, 'FORBIDDEN', e.message);
      else if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else next(err);
    }
  },

  async bulk(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const partial = req.query.partial === 'true';
      const result = await inventoryService.bulkUpsert(
        req.userId,
        req.params.pharmacy_id,
        req.body.items,
        partial
      );
      sendSuccess(res, result, 'Bulk operation completed');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 403) sendError(res, 403, 'FORBIDDEN', e.message);
      else if (e.statusCode === 400) sendError(res, 400, 'BAD_REQUEST', e.message);
      else next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      await inventoryService.remove(
        req.userId,
        req.params.pharmacy_id,
        req.params.inventory_id
      );
      sendNoContent(res);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 403) sendError(res, 403, 'FORBIDDEN', e.message);
      else if (e.statusCode === 404) sendError(res, 404, 'NOT_FOUND', e.message);
      else next(err);
    }
  },
};
