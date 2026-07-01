import { Router } from 'express';
import { adminController } from './admin.controller';
import { complaintsController } from '../complaints/complaints.controller';
import { validate } from '../../middleware/validate';
import {
  ListUsersSchema,
  UpdateUserSchema,
  ListPharmaciesAdminSchema,
  PharmacyIdSchema,
  RejectPharmacySchema,
  SuspendPharmacySchema,
  ListMedicinesAdminSchema,
  CreateMedicineSchema,
  UpdateMedicineSchema,
  StatsQuerySchema,
  ActivityQuerySchema,
} from './admin.schemas';
import {
  ListComplaintsSchema,
  RespondComplaintSchema,
  UpdateComplaintStatusSchema,
} from '../complaints/complaints.schemas';

const router = Router();

// ─── Users ────────────────────────────────────────────────────────────────────
// GET /admin/users
router.get('/users', validate(ListUsersSchema), adminController.listUsers);
// PATCH /admin/users/:id
router.patch('/users/:id', validate(UpdateUserSchema), adminController.updateUser);

// ─── Pharmacies ───────────────────────────────────────────────────────────────
// GET /admin/pharmacies
router.get('/pharmacies', validate(ListPharmaciesAdminSchema), adminController.listPharmacies);
// PATCH /admin/pharmacies/:id/approve
router.patch('/pharmacies/:id/approve', validate(PharmacyIdSchema), adminController.approvePharmacy);
// PATCH /admin/pharmacies/:id/reject
router.patch('/pharmacies/:id/reject', validate(RejectPharmacySchema), adminController.rejectPharmacy);
// PATCH /admin/pharmacies/:id/suspend
router.patch('/pharmacies/:id/suspend', validate(SuspendPharmacySchema), adminController.suspendPharmacy);
// GET /admin/pharmacies/:id/inventory
router.get('/pharmacies/:id/inventory', adminController.getPharmacyInventory);
// POST /admin/pharmacies/:id/query — send question back to applicant without changing status
router.post('/pharmacies/:id/query', adminController.sendOwnerQuery);

// ─── Medicines ────────────────────────────────────────────────────────────────
// GET /admin/medicines
router.get('/medicines', validate(ListMedicinesAdminSchema), adminController.listMedicines);
// POST /admin/medicines
router.post('/medicines', validate(CreateMedicineSchema), adminController.createMedicine);
// PUT /admin/medicines/:id
router.put('/medicines/:id', validate(UpdateMedicineSchema), adminController.updateMedicine);

// ─── Stats & Activity ─────────────────────────────────────────────────────────
router.get('/stats', validate(StatsQuerySchema), adminController.getStats);
router.get('/activity', validate(ActivityQuerySchema), adminController.getActivity);

// ─── Broadcast ────────────────────────────────────────────────────────────────
// POST /admin/broadcast — send notification to all users, all staff, or both
router.post('/broadcast', adminController.broadcastNotification);
// GET /admin/broadcasts — list sent broadcasts history
router.get('/broadcasts', adminController.listBroadcasts);

// ─── Complaints ──────────────────────────────────────────────────────────────
// GET /admin/complaints
router.get('/complaints', validate(ListComplaintsSchema), complaintsController.listAll);
// POST /admin/complaints/:id/respond — send text reply + update status
router.post('/complaints/:id/respond', validate(RespondComplaintSchema), complaintsController.respond);
// PATCH /admin/complaints/:id/status — quick approve or close only
router.patch('/complaints/:id/status', validate(UpdateComplaintStatusSchema), complaintsController.updateStatus);

export { router as adminRouter };
