import { Router } from 'express';
import { ordersController } from './orders.controller';

const router = Router();

// POST /orders — create order or visit request
router.post('/', ordersController.create);

// GET /orders — list orders (patient: own; staff: pharmacy's)
router.get('/', ordersController.list);

// GET /orders/:id — get single order
router.get('/:id', ordersController.getById);

// PATCH /orders/:id/respond — staff responds (approve/reject/complete/cancel/confirm_delivery)
router.patch('/:id/respond', ordersController.respond);

// PATCH /orders/:id/submit-receipt — patient uploads payment receipt screenshot
router.patch('/:id/submit-receipt', ordersController.submitReceipt);

export { router as ordersRouter };
