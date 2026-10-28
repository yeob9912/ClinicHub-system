import { Request, Response, NextFunction } from 'express';
import { handleAiChat, ChatMessage, AiRole } from './ai.service';
import { UserModel } from '../../models/User';
import { PharmacyModel } from '../../models/Pharmacy';
import { sendSuccess, sendError } from '../../utils/response';

export const aiController = {
  async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const { message, history = [] } = req.body as {
        message: string;
        history?: ChatMessage[];
      };

      if (!message || typeof message !== 'string' || !message.trim()) {
        sendError(res, 400, 'BAD_REQUEST', 'message is required');
        return;
      }

      if (message.trim().length > 2000) {
        sendError(res, 400, 'BAD_REQUEST', 'message must be under 2000 characters');
        return;
      }

      // Resolve role from DB (not from request body — backend enforced)
      const user = await UserModel.findById(userId).lean();
      if (!user) {
        sendError(res, 401, 'UNAUTHORIZED', 'User not found');
        return;
      }

      const role = user.role as AiRole;

      // For pharmacy_staff, resolve their authorized pharmacy ID
      let pharmacyId: string | undefined;
      if (role === 'pharmacy_staff') {
        const pharmacy = await PharmacyModel.findOne({ owner_id: userId }).lean();
        pharmacyId = pharmacy?._id.toString();
      }

      const reply = await handleAiChat(userId, role, message.trim(), history, pharmacyId);

      sendSuccess(res, { reply, role }, 'OK');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number; code?: string };
      if (e.statusCode === 503) {
        sendError(res, 503, e.code ?? 'SERVICE_UNAVAILABLE', e.message);
        return;
      }
      next(err);
    }
  },
};
