import { z } from 'zod';

const pharmacyIdParam = z.object({ pharmacy_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format') });

export const ListInventorySchema = z.object({
  params: pharmacyIdParam,
  query: z.object({
    in_stock: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    low_stock: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    category_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format').optional(),
    search: z.string().optional(),
    sort: z.enum(['medicine_name', 'price', 'stock_quantity', 'last_updated']).optional().default('medicine_name'),
    order: z.enum(['asc', 'desc']).optional().default('asc'),
    page: z.string().transform(Number).optional().default('1'),
    limit: z.string().transform(Number).pipe(z.number().max(100)).optional().default('50'),
  }),
});

export const AddInventorySchema = z.object({
  params: pharmacyIdParam,
  body: z.object({
    medicine_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
    price: z.number().min(0),
    currency: z.string().length(3).default('NGN'),
    stock_quantity: z.number().int().min(0),
    low_stock_threshold: z.number().int().min(0).default(10),
  }),
});

export const UpdateInventorySchema = z.object({
  params: z.object({
    pharmacy_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
    inventory_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
  }),
  body: z
    .object({
      price: z.number().min(0).optional(),
      stock_quantity: z.number().int().min(0).optional(),
      low_stock_threshold: z.number().int().min(0).optional(),
    })
    .refine(
      (data) => Object.keys(data).length > 0,
      { message: 'At least one field is required for update' }
    ),
});

export const BulkInventorySchema = z.object({
  params: pharmacyIdParam,
  body: z.object({
    items: z
      .array(
        z.object({
          medicine_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
          price: z.number().min(0),
          stock_quantity: z.number().int().min(0),
          low_stock_threshold: z.number().int().min(0).optional(),
        })
      )
      .min(1)
      .max(100, 'Maximum 100 items per bulk request'),
  }),
});

export const DeleteInventorySchema = z.object({
  params: z.object({
    pharmacy_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
    inventory_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
  }),
});
