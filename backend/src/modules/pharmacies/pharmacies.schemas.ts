import { z } from 'zod';

const ethiopianPhone = z
  .string()
  .transform((val) => {
    if (!val) return val;
    let cleaned = val.replace(/[\s\-\(\)]+/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '+251' + cleaned.substring(1);
    } else if (/^[79]\d{8}$/.test(cleaned)) {
      cleaned = '+251' + cleaned;
    } else if (!cleaned.startsWith('+') && cleaned.length > 0) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  })
  .refine((val) => /^\+251[79]\d{8}$/.test(val), {
    message: 'Phone must be in Ethiopian format: +251[7|9]XXXXXXXX',
  });

const operatingHoursDay = z.object({
  open:   z.string().default('08:00'),
  close:  z.string().default('20:00'),
  closed: z.boolean().default(false),
});

const operatingHoursSchema = z.object({
  mon: operatingHoursDay.optional().default({ open: '08:00', close: '20:00', closed: false }),
  tue: operatingHoursDay.optional().default({ open: '08:00', close: '20:00', closed: false }),
  wed: operatingHoursDay.optional().default({ open: '08:00', close: '20:00', closed: false }),
  thu: operatingHoursDay.optional().default({ open: '08:00', close: '20:00', closed: false }),
  fri: operatingHoursDay.optional().default({ open: '08:00', close: '20:00', closed: false }),
  sat: operatingHoursDay.optional().default({ open: '09:00', close: '17:00', closed: false }),
  sun: operatingHoursDay.optional().default({ open: '10:00', close: '14:00', closed: false }),
}).default({});

export const CreatePharmacySchema = z.object({
  body: z.object({
    name:             z.string().min(2).max(150),
    address:          z.string().min(2).optional().default(''),
    city:             z.string().min(1).optional().default('Addis Ababa'),
    state:            z.string().optional(),
    country:          z.string().optional().default('ET'),
    description:      z.string().max(1000).optional(),
    // Default to Addis Ababa centre if not provided
    latitude:         z.number().min(-90).max(90).optional().default(9.03),
    longitude:        z.number().min(-180).max(180).optional().default(38.74),
    phone:            ethiopianPhone,
    email:            z.string().email().optional(),
    website:          z.string().url().optional().or(z.literal('')),
    logo_url:         z.string().min(1, 'Logo is required'),
    operating_hours:  operatingHoursSchema.optional(),
  }),
});

export const UpdatePharmacySchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format') }),
  body: z.object({
    name:            z.string().min(2).max(150).optional(),
    address:         z.string().optional(),
    city:            z.string().optional(),
    state:           z.string().optional(),
    description:     z.string().max(1000).optional(),
    latitude:        z.number().min(-90).max(90).optional(),
    longitude:       z.number().min(-180).max(180).optional(),
    phone:           ethiopianPhone.optional(),
    email:           z.string().email().optional(),
    website:         z.string().url().optional().or(z.literal('')),
    logo_url:        z.string().optional(),
    operating_hours: operatingHoursSchema.optional(),
  }),
});

export const NearbyQuerySchema = z.object({
  query: z.object({
    lat:    z.string().transform(Number).pipe(z.number().min(-90).max(90)),
    lng:    z.string().transform(Number).pipe(z.number().min(-180).max(180)),
    radius: z.string().transform(Number).pipe(z.number().min(0.5).max(100)).optional().default('10'),
    city:   z.string().optional(),
    page:   z.string().transform(Number).optional().default('1'),
    limit:  z.string().transform(Number).pipe(z.number().max(50)).optional().default('20'),
  }),
});

export const PharmacyIdSchema = z.object({
  params: z.object({ id: z.string().regex(/^(?:[0-9a-fA-F]{24}|p\d+)$/, 'Invalid ID format') }),
});

export const RatePharmacySchema = z.object({
  params: z.object({ id: z.string().regex(/^(?:[0-9a-fA-F]{24}|p\d+)$/, 'Invalid ID format') }),
  body: z.object({
    rating: z.number().min(1).max(5),
  }),
});
