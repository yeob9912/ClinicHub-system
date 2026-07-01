import { z } from 'zod';

export const AddWatchlistSchema = z.object({
  body: z.object({
    medicine_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
    pharmacy_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format').optional().nullable(),
    notify_price_change: z.boolean().default(true),
    notify_back_in_stock: z.boolean().default(true),
    target_price: z.number().positive().optional().nullable(),
  }),
});

export const WatchlistIdSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format') }),
});

export const ListNotificationsSchema = z.object({
  query: z.object({
    is_read: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    type: z
      .enum(['price_drop', 'back_in_stock', 'price_increase', 'pharmacy_approved', 'pharmacy_rejected', 'system', 'chat_message', 'visit_request', 'order_placed', 'order_approved', 'order_rejected', 'order_completed', 'order_cancelled'])
      .optional(),
    page: z.string().transform(Number).optional().default('1'),
    limit: z.string().transform(Number).pipe(z.number().max(50)).optional().default('20'),
  }),
});

export const NotificationIdSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format') }),
});

// Alias for route compatibility
export const WatchlistAddSchema = AddWatchlistSchema;

