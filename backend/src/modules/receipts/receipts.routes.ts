import { Router } from 'express';
import { receiptsController } from './receipts.controller';

export const receiptsRouter = Router();

// GET /api/v1/receipts             — list all receipts for the staff's pharmacy
receiptsRouter.get('/', receiptsController.list);

// GET /api/v1/receipts/order/:order_id — get receipt by order id
receiptsRouter.get('/order/:order_id', receiptsController.getByOrderId);
