import { Router } from 'express';
import { inventoryController } from './inventory.controller';
import { validate } from '../../middleware/validate';
import { inventoryRateLimiter } from '../../middleware/rateLimiter';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth';
import {
  ListInventorySchema,
  AddInventorySchema,
  UpdateInventorySchema,
  BulkInventorySchema,
  DeleteInventorySchema,
} from './inventory.schemas';

// Mounted at /pharmacies/:pharmacy_id/inventory
const router = Router({ mergeParams: true });

// GET /pharmacies/:pharmacy_id/inventory
router.get('/', optionalAuthMiddleware, validate(ListInventorySchema), inventoryController.list);

// POST /pharmacies/:pharmacy_id/inventory
router.post('/', authMiddleware, inventoryRateLimiter, validate(AddInventorySchema), inventoryController.add);

// POST /pharmacies/:pharmacy_id/inventory/bulk
router.post('/bulk', authMiddleware, inventoryRateLimiter, validate(BulkInventorySchema), inventoryController.bulk);

// PATCH /pharmacies/:pharmacy_id/inventory/:inventory_id
router.patch('/:inventory_id', authMiddleware, inventoryRateLimiter, validate(UpdateInventorySchema), inventoryController.update);

// DELETE /pharmacies/:pharmacy_id/inventory/:inventory_id
router.delete('/:inventory_id', authMiddleware, validate(DeleteInventorySchema), inventoryController.remove);

export { router as inventoryRouter };
