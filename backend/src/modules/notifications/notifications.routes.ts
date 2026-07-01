import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { validate } from '../../middleware/validate';
import { WatchlistAddSchema, WatchlistIdSchema, NotificationIdSchema } from './notifications.schemas';

const router = Router();

// ─── Watchlist ──────────────────────────────────────────────────────────────

// GET /watchlist
router.get('/watchlist', notificationsController.getWatchlist);

// POST /watchlist
router.post('/watchlist', validate(WatchlistAddSchema), notificationsController.addToWatchlist);

// DELETE /watchlist/:id
router.delete('/watchlist/:id', validate(WatchlistIdSchema), notificationsController.removeFromWatchlist);

// ─── Notifications ──────────────────────────────────────────────────────────

// GET /notifications
router.get('/notifications', notificationsController.getNotifications);

// PATCH /notifications/read-all  — must be before /:id
router.patch('/notifications/read-all', notificationsController.markAllAsRead);

// PATCH /notifications/:id/read
router.patch('/notifications/:id/read', validate(NotificationIdSchema), notificationsController.markAsRead);

// DELETE /notifications/:id
router.delete('/notifications/:id', validate(NotificationIdSchema), notificationsController.deleteNotification);

export { router as notificationsRouter };
