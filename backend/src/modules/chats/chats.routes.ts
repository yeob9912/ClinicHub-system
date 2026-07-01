import { Router } from 'express';
import { chatsController } from './chats.controller';

const router = Router();

// POST /chats — send a message
router.post('/', chatsController.send);

// GET /chats/conversations — list conversations (grouped by pharmacy, user view)
router.get('/conversations', chatsController.listConversations);

// GET /chats/pharmacy/:pharmacy_id/conversations — all conversations for a pharmacy (staff view)
router.get('/pharmacy/:pharmacy_id/conversations', chatsController.listPharmacyConversations);

// GET /chats/:pharmacy_id — get full chat history with a pharmacy (supports ?user_id= for staff)
router.get('/:pharmacy_id', chatsController.getHistory);

// PATCH /chats/:pharmacy_id/read — mark messages as read
router.patch('/:pharmacy_id/read', chatsController.markRead);

export { router as chatsRouter };
