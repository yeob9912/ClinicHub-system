import { Request, Response, NextFunction } from 'express';
import { ReceiptsService } from './receipts.service';
import { sendSuccess, sendError, sendUnauthorized, sendPaginated } from '../../utils/response';

const receiptsService = new ReceiptsService();

export const receiptsController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const result = await receiptsService.list(req.userId, req.query as any);
      sendPaginated(res, result.data, result.meta as any, 'Receipts retrieved');
    } catch (err: any) {
      if (err.statusCode === 404) sendError(res, 404, 'NOT_FOUND', err.message);
      else next(err);
    }
  },

  async getByOrderId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const receipt = await receiptsService.getByOrderId(req.params.order_id);
      sendSuccess(res, receipt);
    } catch (err: any) {
      if (err.statusCode === 404) sendError(res, 404, 'NOT_FOUND', err.message);
      else next(err);
    }
  },
};
