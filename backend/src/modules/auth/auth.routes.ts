import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authMiddleware } from '../../middleware/auth';
import { authLoginRateLimiter, forgotPasswordRateLimiter } from '../../middleware/rateLimiter';
import {
  RegisterSchema,
  LoginSchema,
  LogoutSchema,
  RefreshSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  SendOtpSchema,
} from './auth.schemas';

const router = Router();

/**
 * POST /auth/register
 * Public. Rate-limited to 10 requests per 15 min per IP.
 */
router.post(
  '/register',
  authLoginRateLimiter,
  validate(RegisterSchema),
  authController.register
);

/**
 * POST /auth/login
 * Public. Email+password or phone+OTP.
 * Rate-limited to 10 requests per 15 min per IP.
 */
router.post(
  '/login',
  authLoginRateLimiter,
  validate(LoginSchema),
  authController.login
);

router.get('/google', authLoginRateLimiter, authController.googleStart);
router.get('/google/callback', authController.googleCallback);

/**
 * POST /auth/logout
 * Protected — requires a valid JWT.
 * Uses admin.signOut(userId) to revoke all sessions for the user.
 * No body required — identity comes from the Authorization header.
 */
router.post(
  '/logout',
  authMiddleware,         // sets req.userId from JWT
  validate(LogoutSchema),
  authController.logout
);

/**
 * POST /auth/refresh
 * Public — used to get a new access_token from a valid refresh_token.
 */
router.post(
  '/refresh',
  validate(RefreshSchema),
  authController.refresh
);

/**
 * POST /auth/forgot-password
 * Public. Rate-limited to 3 requests per hour per email.
 * Always returns 200 to prevent email enumeration.
 */
router.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  validate(ForgotPasswordSchema),
  authController.forgotPassword
);

/**
 * POST /auth/reset-password
 * Public — completes password reset using the PKCE code / OTP token from the
 * reset email. The token is exchanged for a scoped session and the password
 * is updated on that session-scoped client.
 */
router.post(
  '/reset-password',
  validate(ResetPasswordSchema),
  authController.resetPassword
);

/**
 * POST /auth/send-otp
 * Public. Sends a 6-digit SMS OTP valid for 5 minutes.
 * Rate-limited to 10 requests per 15 min per IP.
 */
router.post(
  '/send-otp',
  authLoginRateLimiter,
  validate(SendOtpSchema),
  authController.sendOtp
);

/**
 * GET /auth/mail-sandbox
 * Public / Dev test tool — list all mock emails sent.
 */
router.get('/mail-sandbox', authController.getMailSandbox);

export { router as authRouter };
