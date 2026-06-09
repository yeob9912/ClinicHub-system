import { Router } from 'express';
import { complaintsController } from './complaints.controller';
import { validate } from '../../middleware/validate';
import { authMiddleware } from '../../middleware/auth';
import {
  SubmitComplaintSchema,
  ListComplaintsSchema,
  ComplaintIdSchema,
  RespondComplaintSchema,
  UpdateComplaintStatusSchema,
} from './complaints.schemas';

const router = Router();

// POST /complaints — authenticated user submits a complaint
router.post('/', authMiddleware, validate(SubmitComplaintSchema), complaintsController.submit);

// GET /complaints/me — user sees their own complaint history
router.get('/me', authMiddleware, validate(ListComplaintsSchema), complaintsController.listMine);

export { router as complaintsRouter };
