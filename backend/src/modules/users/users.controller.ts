import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import {
  sendSuccess,
  sendNoContent,
  sendError,
  sendUnauthorized,
} from '../../utils/response';

const usersService = new UsersService();

export const usersController = {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const profile = await usersService.getProfile(req.userId);
      sendSuccess(res, profile);
    } catch (err) {
      next(err);
    }
  },

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const updated = await usersService.updateProfile(req.userId, req.body);
      sendSuccess(res, updated, 'Profile updated');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 409) {
        sendError(res, 409, 'CONFLICT', e.message);
      } else {
        next(err);
      }
    }
  },

  async uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      if (!req.file) {
        sendError(res, 400, 'BAD_REQUEST', 'No file uploaded');
        return;
      }
      const result = await usersService.uploadAvatar(req.userId, req.file);
      sendSuccess(res, result, 'Avatar uploaded');
    } catch (err) {
      next(err);
    }
  },

  async deleteMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const result = await usersService.deleteAccount(req.userId);
      sendSuccess(res, result, result.message);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 422) {
        sendError(res, 422, 'UNPROCESSABLE_ENTITY', e.message);
      } else {
        next(err);
      }
    }
  },

  async toggleFavorite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) { sendUnauthorized(res); return; }
      const { type, id } = req.body;
      if (!type || !id) {
        sendError(res, 400, 'BAD_REQUEST', 'Missing type or id');
        return;
      }
      const updated = await usersService.toggleFavorite(req.userId, { type, id });
      sendSuccess(res, updated, 'Favorites updated');
    } catch (err) {
      next(err);
    }
  },
};
