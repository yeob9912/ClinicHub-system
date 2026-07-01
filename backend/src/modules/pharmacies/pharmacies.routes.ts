import { Router } from 'express';
import { pharmaciesController } from './pharmacies.controller';
import { validate } from '../../middleware/validate';
import { logoUpload } from '../../middleware/upload';
import { searchRateLimiter } from '../../middleware/rateLimiter';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth';
import {
  CreatePharmacySchema,
  UpdatePharmacySchema,
  NearbyQuerySchema,
  PharmacyIdSchema,
  RatePharmacySchema,
} from './pharmacies.schemas';

const router = Router();

// GET /pharmacies — list approved pharmacies (PUBLIC)
router.get('/', pharmaciesController.list);

// GET /pharmacies/nearby (PUBLIC)
router.get('/nearby', searchRateLimiter, validate(NearbyQuerySchema), pharmaciesController.getNearby);

// GET /pharmacies/:id (PUBLIC)
router.get('/:id', optionalAuthMiddleware, validate(PharmacyIdSchema), pharmaciesController.getById);

// POST /pharmacies — requires auth
router.post('/', authMiddleware, validate(CreatePharmacySchema), pharmaciesController.create);

// PUT /pharmacies/:id — requires auth
router.put('/:id', authMiddleware, validate(UpdatePharmacySchema), pharmaciesController.update);

// POST /pharmacies/:id/logo — requires auth
router.post('/:id/logo', authMiddleware, logoUpload.single('logo'), pharmaciesController.uploadLogo);

// PATCH /pharmacies/:id/settings — requires auth
router.patch(
  '/:id/settings',
  authMiddleware,
  pharmaciesController.updateSettings
);

// POST /pharmacies/:id/rate — requires auth
router.post(
  '/:id/rate',
  authMiddleware,
  validate(RatePharmacySchema),
  pharmaciesController.ratePharmacy
);

// POST /pharmacies/:id/announcements — requires auth
router.post('/:id/announcements', authMiddleware, pharmaciesController.createAnnouncement);

// PUT /pharmacies/:id/announcements/:announcementId — requires auth
router.put('/:id/announcements/:announcementId', authMiddleware, pharmaciesController.updateAnnouncement);

// DELETE /pharmacies/:id/announcements/:announcementId — requires auth
router.delete('/:id/announcements/:announcementId', authMiddleware, pharmaciesController.deleteAnnouncement);

export { router as pharmaciesRouter };