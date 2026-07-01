import { Request, Response, NextFunction } from 'express';
import { CallsService } from './calls.service';

const svc = new CallsService();

export class CallsController {
  async initiate(req: Request, res: Response, next: NextFunction) {
    try {
      const callerId = (req as any).user.id;
      const call = await svc.initiateCall(callerId, req.body);
      res.status(201).json({ data: call });
    } catch (err) { next(err); }
  }

  async getActive(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const call = await svc.getActiveCall(userId);
      res.json({ data: call });
    } catch (err) { next(err); }
  }

  async respond(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const { action } = req.body;
      if (!['accept', 'reject'].includes(action)) {
        res.status(400).json({ message: 'action must be accept or reject' });
        return;
      }
      const call = await svc.respondToCall(id, userId, action);
      res.json({ data: call });
    } catch (err) { next(err); }
  }

  async end(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const call = await svc.endCall(req.params.id, userId);
      res.json({ data: call });
    } catch (err) { next(err); }
  }
}
