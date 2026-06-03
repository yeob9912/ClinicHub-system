import { z } from 'zod';

// ─── Shared Sub-schemas ───────────────────────────────────────────────────────

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g. +2348012345678)')
  .optional()
  .nullable();

const operatingHoursSchema = z.object({
  mon: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  tue: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  wed: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  thu: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  fri: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  sat: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  sun: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
});

// ─── Register ─────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  body: z
    .object({
      email: z.string().email('Invalid email format'),
      password: passwordSchema.optional().nullable(),
      full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
      phone: phoneSchema,
      role: z.enum(['patient', 'pharmacy_staff']).default('patient'),
      google_id: z.string().optional(),
      pharmacy: z
        .object({
          name: z.string().min(2).max(150),
          address: z.string().min(5),
          city: z.string().min(1),
          state: z.string().optional(),
          country: z.string().default('NG'),
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          phone: z.string().min(6),
          email: z.string().email().optional(),
          website: z.string().url().optional(),
          operating_hours: operatingHoursSchema,
        })
        .optional(),
    })
    .refine(
      (data) => !(data.role === 'pharmacy_staff' && !data.pharmacy),
      { message: 'pharmacy object is required when role is pharmacy_staff', path: ['pharmacy'] }
    )
    .refine(
      (data) => {
        if (data.google_id) return true;
        return !!data.password;
      },
      { message: 'Password is required when registering without Google', path: ['password'] }
    ),
});

// ─── Login ────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  body: z
    .object({
      // Email+password login
      email: z.string().email('Invalid email format').optional(),
      password: z.string().min(1, 'Password is required for email login').optional(),
      // Phone+OTP login
      phone: phoneSchema,
      otp: z.string().length(6, 'OTP must be exactly 6 digits').optional(),
    })
    .refine(
      (data) => {
        const hasEmailLogin = Boolean(data.email && data.password);
        const hasPhoneLogin = Boolean(data.phone && data.otp);
        return hasEmailLogin || hasPhoneLogin;
      },
      {
        message: 'Provide either email+password or phone+otp',
        path: ['email'],
      }
    ),
});

// ─── Logout ───────────────────────────────────────────────────────────────────
// Logout uses the JWT from the Authorization header (enforced by authMiddleware).
// No body required — the user is identified from req.userId set by the middleware.
export const LogoutSchema = z.object({
  body: z.object({}).optional(),
});

// ─── Token Refresh ────────────────────────────────────────────────────────────

export const RefreshSchema = z.object({
  body: z.object({
    refresh_token: z.string().min(1, 'refresh_token is required'),
  }),
});

// ─── Forgot Password ─────────────────────────────────────────────────────────

export const ForgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    redirect_to: z.string().url('redirect_to must be a valid URL').optional(),
  }),
});

// ─── Reset Password ───────────────────────────────────────────────────────────

export const ResetPasswordSchema = z.object({
  body: z.object({
    // The PKCE code or OTP token_hash from the reset email link
    token: z.string().min(1, 'Reset token is required'),
    email: z.string().email('Invalid email format'),
    new_password: passwordSchema,
  }),
});

// ─── Send OTP ─────────────────────────────────────────────────────────────────

export const SendOtpSchema = z.object({
  body: z.object({
    phone: z
      .string()
      .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g. +2348012345678)'),
  }),
});
