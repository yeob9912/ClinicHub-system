import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { env } from '../../config/env';
import { sendSuccess, sendCreated, sendError } from '../../utils/response';

const authService = new AuthService();

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      sendCreated(res, result, 'Account created successfully');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number; code?: string };
      if (e.statusCode === 409) {
        sendError(res, 409, e.code || 'CONFLICT', e.message);
      } else if (e.statusCode === 429) {
        sendError(res, 429, e.code || 'RATE_LIMIT_EXCEEDED', e.message);
      } else if (e.statusCode === 400) {
        sendError(res, 400, e.code || 'BAD_REQUEST', e.message);
      } else {
        next(err);
      }
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      sendSuccess(res, result, 'Login successful');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number; code?: string };
      if (e.statusCode === 401) {
        sendError(res, 401, e.code || 'UNAUTHORIZED', e.message);
      } else if (e.statusCode === 400) {
        sendError(res, 400, e.code || 'BAD_REQUEST', e.message);
      } else {
        next(err);
      }
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // req.userId is the Supabase auth_id, set by authMiddleware
      // This is passed to admin.signOut to revoke all sessions for this user
      if (!req.userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
        return;
      }
      const result = await authService.logout(req.userId);
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refresh_token } = req.body;
      const result = await authService.refresh(refresh_token);
      sendSuccess(res, result, 'Token refreshed successfully');
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number; code?: string };
      if (e.statusCode === 401) {
        sendError(res, 401, e.code || 'REFRESH_TOKEN_INVALID', e.message);
      } else {
        next(err);
      }
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      // Always 200 — never reveal whether the email exists
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, email, new_password } = req.body;
      const result = await authService.resetPassword(token, email, new_password);
      sendSuccess(res, result, result.message);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number; code?: string };
      if (e.statusCode === 400) {
        sendError(res, 400, e.code || 'BAD_REQUEST', e.message);
      } else {
        next(err);
      }
    }
  },

  googleStart(req: Request, res: Response, next: NextFunction): void {
    try {
      const origin = req.headers.referer || req.headers.origin;
      let returnTo = env.FRONTEND_URL;
      if (typeof origin === 'string' && origin.startsWith('http')) {
        try {
          returnTo = new URL(origin).origin;
        } catch {
          // ignore
        }
      }

      const host = req.get('host') || 'localhost:3001';
      const isHttps = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https';
      const protocol = isHttps ? 'https' : 'http';

      let redirectUri: string;
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        redirectUri = `${protocol}://${host}/api/v1/auth/google/callback`;
      } else if (env.GOOGLE_REDIRECT_URI) {
        redirectUri = env.GOOGLE_REDIRECT_URI;
      } else {
        redirectUri = `${protocol}://${host}/api/v1/auth/google/callback`;
      }

      const url = authService.getGoogleAuthUrl({ redirectUri, returnTo });
      res.redirect(url);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 503) {
        res.redirect(`${env.FRONTEND_URL}/login?error=${encodeURIComponent(e.message)}`);
        return;
      }
      next(err);
    }
  },

  async googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    let customRedirectUri: string | undefined;
    let targetFrontend = env.FRONTEND_URL;

    const rawState = req.query.state as string | undefined;
    if (rawState) {
      try {
        const decoded = JSON.parse(Buffer.from(rawState, 'base64url').toString('utf8'));
        if (decoded.redirectUri && typeof decoded.redirectUri === 'string') {
          customRedirectUri = decoded.redirectUri;
        }
        if (decoded.returnTo && typeof decoded.returnTo === 'string' && decoded.returnTo.startsWith('http')) {
          targetFrontend = decoded.returnTo;
        }
      } catch {
        // Fall back to defaults
      }
    }

    try {
      const code = req.query.code as string | undefined;

      if (!code) {
        res.redirect(`${targetFrontend}/login?error=${encodeURIComponent('Google sign-in was cancelled')}`);
        return;
      }

      const result = await authService.handleGoogleCallback(code, customRedirectUri);
      const params = new URLSearchParams({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });

      res.redirect(`${targetFrontend}/auth/callback?${params.toString()}`);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number; code?: string; googleProfile?: { email?: string; name?: string; google_id?: string } };

      // New user — no account found: send them to signup with profile pre-filled
      if (e.code === 'GOOGLE_USER_NOT_FOUND' && e.googleProfile) {
        const { email = '', name = '', google_id = '' } = e.googleProfile;
        const params = new URLSearchParams({
          google_signup: '1',
          email,
          name,
          google_id,
        });
        res.redirect(`${targetFrontend}/signup?${params.toString()}`);
        return;
      }

      res.redirect(`${targetFrontend}/login?error=${encodeURIComponent(e.message || 'Google sign-in failed')}`);
    }
  },

  async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone } = req.body;
      const result = await authService.sendOtp(phone);
      sendSuccess(res, result, result.message);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number; code?: string };
      if (e.statusCode === 429) {
        sendError(res, 429, e.code || 'OTP_RATE_LIMITED', e.message);
      } else if (e.statusCode === 400) {
        sendError(res, 400, e.code || 'OTP_SEND_FAILED', e.message);
      } else {
        next(err);
      }
    }
  },

  async getMailSandbox(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.getMailSandbox();
      sendSuccess(res, result, 'Mail sandbox messages retrieved successfully');
    } catch (err) {
      next(err);
    }
  },
};
