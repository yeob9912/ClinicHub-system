import { Request, Response, NextFunction } from 'express';
import { OrdersService } from './orders.service';
import { sendSuccess, sendCreated, sendError, sendUnauthorized, sendPaginated } from '../../utils/response';
import { UserModel } from '../../models/User';

const ordersService = new OrdersService();

export const ordersController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const order = await ordersService.create(req.userId, req.body);
      sendCreated(res, order, 'Request submitted successfully');
    } catch (err: any) {
      if (err.statusCode === 404) sendError(res, 404, 'NOT_FOUND', err.message);
      else if (err.statusCode === 422) sendError(res, 422, 'UNPROCESSABLE', err.message);
      else next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const user = await UserModel.findById(req.userId).select('role').lean();
      const result = await ordersService.list(req.userId, user?.role ?? 'patient', req.query as any);
      sendPaginated(res, result.data, result.meta as any, 'Orders retrieved');
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const user = await UserModel.findById(req.userId).select('role').lean();
      const order = await ordersService.getById(req.userId, user?.role ?? 'patient', req.params.id);
      sendSuccess(res, order);
    } catch (err: any) {
      if (err.statusCode === 404) sendError(res, 404, 'NOT_FOUND', err.message);
      else if (err.statusCode === 403) sendError(res, 403, 'FORBIDDEN', err.message);
      else next(err);
    }
  },

  async respond(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const order = await ordersService.respond(req.userId, req.params.id, req.body);
      sendSuccess(res, order, 'Order updated');
    } catch (err: any) {
      if (err.statusCode === 404) sendError(res, 404, 'NOT_FOUND', err.message);
      else if (err.statusCode === 403) sendError(res, 403, 'FORBIDDEN', err.message);
      else if (err.statusCode === 422) sendError(res, 422, 'UNPROCESSABLE', err.message);
      else next(err);
    }
  },

  // Patient submits payment receipt screenshot (base64)
  async submitReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const { receipt_url } = req.body;
      if (!receipt_url) { sendError(res, 422, 'UNPROCESSABLE', 'receipt_url is required'); return; }
      const order = await ordersService.submitReceipt(req.userId, req.params.id, receipt_url);
      sendSuccess(res, order, 'Receipt submitted successfully');
    } catch (err: any) {
      if (err.statusCode === 404) sendError(res, 404, 'NOT_FOUND', err.message);
      else if (err.statusCode === 403) sendError(res, 403, 'FORBIDDEN', err.message);
      else if (err.statusCode === 422) sendError(res, 422, 'UNPROCESSABLE', err.message);
      else next(err);
    }
  },
};
