import { Router } from 'express';
import { medicinesController } from './medicines.controller';
import { searchRateLimiter } from '../../middleware/rateLimiter';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// GET /medicines/search  — must be before /:id
router.get('/search', searchRateLimiter, medicinesController.search);

// GET /medicines/categories  — must be before /:id
router.get('/categories', medicinesController.getCategories);

// GET /medicines
router.get('/', medicinesController.list);

// GET /medicines/:id
router.get('/:id', medicinesController.getById);

// GET /medicines/:id/availability
router.get('/:id/availability', searchRateLimiter, medicinesController.getAvailability);

// POST /medicines
router.post('/', authMiddleware, medicinesController.create);

export { router as medicinesRouter };
