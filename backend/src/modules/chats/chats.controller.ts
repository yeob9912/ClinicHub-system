import { Request, Response, NextFunction } from 'express';
import { ChatsService } from './chats.service';
import { sendSuccess, sendCreated, sendError, sendUnauthorized, sendPaginated } from '../../utils/response';

const chatsService = new ChatsService();

export const chatsController = {
  async send(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const msg = await chatsService.send(req.userId, req.body);
      sendCreated(res, msg, 'Message sent');
    } catch (err: any) {
      if (err.statusCode === 404) sendError(res, 404, 'NOT_FOUND', err.message);
      else next(err);
    }
  },

  async listConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const conversations = await chatsService.listConversations(req.userId);
      sendSuccess(res, conversations, 'Conversations retrieved');
    } catch (err) {
      next(err);
    }
  },

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const result = await chatsService.getHistory(req.userId, req.params.pharmacy_id, req.query as any);
      sendPaginated(res, result.data, result.meta as any, 'Messages retrieved');
    } catch (err: any) {
      if (err.statusCode === 404) sendError(res, 404, 'NOT_FOUND', err.message);
      else next(err);
    }
  },

  async listPharmacyConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const { pharmacy_id } = req.params;
      const conversations = await chatsService.listPharmacyConversations(pharmacy_id);
      sendSuccess(res, conversations, 'Pharmacy conversations retrieved');
    } catch (err) {
      next(err);
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const result = await chatsService.markRead(req.userId, req.params.pharmacy_id);
      sendSuccess(res, result, 'Messages marked as read');
    } catch (err) {
      next(err);
    }
  },
};
