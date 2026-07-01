import { Router } from 'express';
import { CallsController } from './calls.controller';

export const callsRouter = Router();
const ctrl = new CallsController();

// POST   /api/v1/calls            — initiate a call
callsRouter.post('/',              ctrl.initiate.bind(ctrl));

// GET    /api/v1/calls/active      — poll for active/incoming call
callsRouter.get('/active',         ctrl.getActive.bind(ctrl));

// PATCH  /api/v1/calls/:id/respond — accept or reject
callsRouter.patch('/:id/respond',  ctrl.respond.bind(ctrl));

// PATCH  /api/v1/calls/:id/end     — end call
callsRouter.patch('/:id/end',      ctrl.end.bind(ctrl));
