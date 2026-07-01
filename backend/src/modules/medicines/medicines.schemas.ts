import { z } from 'zod';

export const SearchQuerySchema = z.object({
  query: z.object({
    q: z.string().min(2, 'Query must be at least 2 characters'),
    category_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format').optional(),
    requires_rx: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    page: z.string().transform(Number).optional().default('1'),
    limit: z.string().transform(Number).pipe(z.number().max(50)).optional().default('20'),
  }),
});

export const ListMedicinesSchema = z.object({
  query: z.object({
    category_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format').optional(),
    requires_rx: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    sort: z.enum(['name', 'created_at']).optional().default('name'),
    order: z.enum(['asc', 'desc']).optional().default('asc'),
    page: z.string().transform(Number).optional().default('1'),
    limit: z.string().transform(Number).optional().default('20'),
  }),
});

export const MedicineIdSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format') }),
});

export const AvailabilityQuerySchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format') }),
  query: z.object({
    lat: z.string().transform(Number).pipe(z.number().min(-90).max(90)),
    lng: z.string().transform(Number).pipe(z.number().min(-180).max(180)),
    radius: z.string().transform(Number).pipe(z.number().max(50)).optional().default('10'),
    sort_by: z.enum(['distance', 'price', 'price_desc']).optional().default('distance'),
    in_stock_only: z.enum(['true', 'false']).transform((v) => v === 'true').optional().default('false'),
    page: z.string().transform(Number).optional().default('1'),
    limit: z.string().transform(Number).pipe(z.number().max(50)).optional().default('20'),
  }),
});

export const CategoriesQuerySchema = z.object({
  query: z.object({
    include_count: z.enum(['true', 'false']).transform((v) => v === 'true').optional().default('false'),
  }),
});
