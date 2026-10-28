import { Router } from 'express';
import { aiController } from './ai.controller';

const router = Router();

// POST /ai/chat — authenticated, role resolved from JWT user
router.post('/chat', aiController.chat);

export { router as aiRouter };
