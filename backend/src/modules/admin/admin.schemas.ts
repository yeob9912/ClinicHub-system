import { z } from 'zod';

export const ListUsersSchema = z.object({
  query: z.object({
    role: z.enum(['patient', 'pharmacy_staff', 'admin']).optional(),
    is_active: z.enum(['true', 'false']).optional(),
    search: z.string().min(1).max(100).optional(),
    sort: z.enum(['created_at', 'full_name', 'email']).optional().default('created_at'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.string().transform(Number).optional().default('1'),
    limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional().default('20'),
  }),
});

export const UpdateUserSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'User ID must be a valid MongoDB ObjectId') }),
  body: z
    .object({
      role: z.enum(['patient', 'pharmacy_staff', 'admin']).optional(),
      is_active: z.boolean().optional(),
    })
    .refine((d) => d.role !== undefined || d.is_active !== undefined, {
      message: 'At least one of role or is_active must be provided',
    }),
});

export const ListPharmaciesAdminSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'suspended', 'rejected']).optional(),
    city: z.string().min(1).max(100).optional(),
    search: z.string().min(1).max(100).optional(),
    page: z.string().transform(Number).optional().default('1'),
    limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional().default('20'),
  }),
});

export const PharmacyIdSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Pharmacy ID must be a valid MongoDB ObjectId') }),
});

export const RejectPharmacySchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Pharmacy ID must be a valid MongoDB ObjectId') }),
  body: z.object({
    reason: z
      .string()
      .min(10, 'Rejection reason must be at least 10 characters')
      .max(500, 'Rejection reason cannot exceed 500 characters'),
  }),
});

export const SuspendPharmacySchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Pharmacy ID must be a valid MongoDB ObjectId') }),
  body: z.object({
    reason: z
      .string()
      .min(5, 'Suspension reason must be at least 5 characters')
      .max(500, 'Suspension reason cannot exceed 500 characters'),
  }),
});

export const ListMedicinesAdminSchema = z.object({
  query: z.object({
    is_active: z.enum(['true', 'false']).optional().default('true'),
    page: z.string().transform(Number).optional().default('1'),
    limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional().default('20'),
  }),
});

// Full dosage_form enum matching the database + seed data
const dosageFormEnum = z.enum([
  'tablet',
  'capsule',
  'syrup',
  'injection',
  'cream',
  'drops',
  'inhaler',
  'patch',
  'other',
]);

export const CreateMedicineSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Medicine name is required').max(255),
    generic_name: z.string().max(255).optional(),
    brand_names: z.array(z.string().max(100)).optional().default([]),
    category: z.string().min(1).max(100).optional(),
    category_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'category_id must be a valid MongoDB ObjectId').optional(),
    description: z.string().max(2000).optional(),
    usage_info: z.string().max(2000).optional(),
    side_effects: z.string().max(2000).optional(),
    manufacturer: z.string().max(255).optional(),
    dosage_form: dosageFormEnum.optional(),
    strength: z.string().max(50).optional(),
    requires_rx: z.boolean().default(false),
    nafdac_number: z.string().max(50).optional(),
    image_url: z.string().max(10 * 1024 * 1024).optional().nullable(),
    price: z.number().min(0).optional().default(0),
  }),
});

export const UpdateMedicineSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Medicine ID must be a valid MongoDB ObjectId') }),
  body: z
    .object({
      name: z.string().min(1).max(255).optional(),
      generic_name: z.string().max(255).optional(),
      brand_names: z.array(z.string().max(100)).optional(),
      category: z.string().min(1).max(100).optional(),
      category_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'category_id must be a valid MongoDB ObjectId').optional(),
      description: z.string().max(2000).optional(),
      usage_info: z.string().max(2000).optional(),
      side_effects: z.string().max(2000).optional(),
      manufacturer: z.string().max(255).optional(),
      dosage_form: dosageFormEnum.optional(),
      strength: z.string().max(50).optional(),
      requires_rx: z.boolean().optional(),
      nafdac_number: z.string().max(50).optional(),
      image_url: z.string().max(10 * 1024 * 1024).optional().nullable(),
      price: z.number().min(0).optional(),
      is_active: z.boolean().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

export const StatsQuerySchema = z.object({
  query: z.object({
    period: z.enum(['7d', '30d', '90d']).optional().default('30d'),
  }),
});

export const ActivityQuerySchema = z.object({
  query: z.object({
    type: z
      .enum(['user_registered', 'pharmacy_registered', 'inventory_update', 'medicine_added'])
      .optional(),
    page: z.string().transform(Number).optional().default('1'),
    limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional().default('50'),
  }),
});
