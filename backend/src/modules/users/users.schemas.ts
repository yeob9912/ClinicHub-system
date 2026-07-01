import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  body: z.object({
    full_name: z.string().min(2).max(100).optional(),
    phone: z
      .string()
      .optional()
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
      .refine((val) => !val || /^\+[1-9]\d{1,14}$/.test(val), {
        message: 'Phone must be in E.164 format (e.g. +251911234567)',
      }),
    // Accept either an https URL or a base64 data URI (for direct image uploads)
    avatar_url: z
      .string()
      .optional()
      .refine(
        (val) =>
          !val ||
          val.startsWith('data:image/') ||
          val.startsWith('https://') ||
          val.startsWith('http://'),
        { message: 'avatar_url must be a valid URL or base64 data URI' }
      ),
    preferences: z
      .object({
        notifications: z.boolean().optional(),
        default_radius_km: z.number().int().min(1).max(50).optional(),
      })
      .optional(),
  }),
});
