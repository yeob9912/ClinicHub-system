import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User';
import { sendForbidden, sendUnauthorized } from '../utils/response';
import { logger } from '../config/logger';

export function roleGuard(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      sendUnauthorized(res);
      return;
    }

    try {
      const user = await UserModel.findById(req.userId).select('role is_active');

      if (!user) {
        sendUnauthorized(res, 'User profile not found');
        return;
      }

      if (!user.is_active) {
        sendForbidden(res, 'Account is deactivated');
        return;
      }

      if (!roles.includes(user.role)) {
        sendForbidden(res, `Requires one of roles: ${roles.join(', ')}`);
        return;
      }

      req.userRole = user.role;
      next();
    } catch (err) {
      logger.error({ err }, 'Role guard error');
      sendForbidden(res, 'Permission check failed');
    }
  };
}
