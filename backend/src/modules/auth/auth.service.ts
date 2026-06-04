import { randomBytes, createHash } from 'crypto';
import { UserModel, toPublicUser } from '../../models/User';
import { NotificationModel } from '../../models/Notification';
import { hashPassword, verifyPassword } from '../../utils/password';
import { signAccessToken, signRefreshToken, verifyToken, getTokenExpirySeconds } from '../../utils/jwt';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { MailSandboxModel } from '../../models/MailSandbox';

export interface RegisterInput {
  email: string;
  password?: string;
  full_name: string;
  phone?: string;
  role?: 'patient' | 'pharmacy_staff';
  google_id?: string;
  pharmacy?: {
    name: string;
    address: string;
    city: string;
    state?: string;
    country?: string;
    latitude: number;
    longitude: number;
    phone: string;
    email?: string;
    website?: string;
    operating_hours: Record<string, unknown>;
  };
}

export interface LoginInput {
  email?: string;
  password?: string;
  phone?: string;
  otp?: string;
  remember?: boolean;
}

function buildSession(userId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + getTokenExpirySeconds('access');
  return {
    access_token: signAccessToken(userId),
    refresh_token: signRefreshToken(userId),
    expires_in: getTokenExpirySeconds('access'),
    expires_at: expiresAt,
  };
}

export class AuthService {
  async register(input: RegisterInput) {
    const { email, password, full_name, phone, role = 'patient', google_id } = input;

    if (role === 'pharmacy_staff' && !input.pharmacy) {
      throw Object.assign(
        new Error('pharmacy object is required when role is pharmacy_staff'),
        { statusCode: 400, code: 'BAD_REQUEST' }
      );
    }

    // If a google_id is provided, check if it already exists (prevents duplicates)
    if (google_id) {
      const existingGoogle = await UserModel.findOne({ google_id });
      if (existingGoogle) {
        throw Object.assign(new Error('This Google account is already linked to an existing user'), {
          statusCode: 409,
          code: 'GOOGLE_ID_EXISTS',
        });
      }
    }

    const existingEmail = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      throw Object.assign(new Error('Email already registered'), {
        statusCode: 409,
        code: 'EMAIL_EXISTS',
      });
    }

    if (phone) {
      const existingPhone = await UserModel.findOne({ phone });
      if (existingPhone) {
        throw Object.assign(new Error('Phone number already registered'), {
          statusCode: 409,
          code: 'PHONE_EXISTS',
        });
      }
    }

    // When registering via Google, generate a random password since the user won't use it
    const rawPassword = password || randomBytes(32).toString('hex');
    const password_hash = await hashPassword(rawPassword);

    const user = await UserModel.create({
      email: email.toLowerCase(),
      password_hash,
      full_name,
      phone: phone || null,
      role,
      ...(google_id ? { google_id } : {}),
    });

    const publicUser = toPublicUser(user);
    const session = buildSession(publicUser.id);

    // ── Notify admin of new signup ─────────────────────────────────────────────
    try {
      const adminUser = await UserModel.findOne({ role: 'admin' }).lean();
      if (adminUser) {
        await NotificationModel.create({
          user_id: adminUser._id,
          type:    'new_user_signup',
          title:   'New User Registered',
          body:    `${full_name} (${email.toLowerCase()}) just signed up as ${role}.`,
          data:    { user_id: user._id.toString(), role, email: email.toLowerCase() },
        });
      }
    } catch (notifyErr) {
      logger.warn({ notifyErr }, 'Failed to notify admin of new signup — non-critical');
    }

    return {
      user: {
        id: publicUser.id,
        email: publicUser.email,
        full_name: publicUser.full_name,
        role: publicUser.role,
      },
      session,
      email_confirmation_required: false,
    };
  }

  async login(input: LoginInput) {
    const { email, password, phone, otp } = input;

    if (phone && otp) {
      throw Object.assign(new Error('Phone OTP login is not enabled'), {
        statusCode: 400,
        code: 'NOT_SUPPORTED',
      });
    }

    if (!email || !password) {
      throw Object.assign(
        new Error('Provide either email+password or phone+otp'),
        { statusCode: 400, code: 'MISSING_CREDENTIALS' }
      );
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+password_hash');

    if (!user?.password_hash || !(await verifyPassword(password, user.password_hash))) {
      throw Object.assign(new Error('Invalid email or password'), {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (!user.is_active) {
      throw Object.assign(new Error('This account has been deactivated'), {
        statusCode: 401,
        code: 'ACCOUNT_INACTIVE',
      });
    }

    const publicUser = toPublicUser(user);

    return {
      user: publicUser,
      session: buildSession(publicUser.id),
    };
  }

  async logout(_userId: string) {
    return { message: 'Logged out successfully' };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = verifyToken(refreshToken, 'refresh');
      const user = await UserModel.findById(payload.sub);

      if (!user || !user.is_active) {
        throw Object.assign(new Error('Refresh token is expired or has been revoked'), {
          statusCode: 401,
          code: 'REFRESH_TOKEN_INVALID',
        });
      }

      return {
        access_token: signAccessToken(payload.sub),
        refresh_token: signRefreshToken(payload.sub),
        expires_at: Math.floor(Date.now() / 1000) + getTokenExpirySeconds('access'),
      };
    } catch {
      throw Object.assign(new Error('Refresh token is expired or has been revoked'), {
        statusCode: 401,
        code: 'REFRESH_TOKEN_INVALID',
      });
    }
  }

  async forgotPassword(email: string) {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw Object.assign(new Error('This email address is not registered in our system.'), {
        statusCode: 404,
        code: 'EMAIL_NOT_FOUND',
      });
    }

    // Generate a 32-byte random token (URL-safe)
    const rawToken = randomBytes(32).toString('hex');
    // Store only the SHA-256 hash — never the raw token in DB
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    user.password_reset_token = tokenHash;
    user.password_reset_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(email.toLowerCase())}`;

    // Log the reset link
    logger.info({ resetUrl, email: email.toLowerCase() }, 'Password reset link generated');

    // Delete any old sandbox mails for this address to prevent duplicate inbox messages
    await MailSandboxModel.deleteMany({ to: email.toLowerCase() });

    // Store in the Mail Sandbox securely
    await MailSandboxModel.create({
      to: email.toLowerCase(),
      subject: 'Password Reset Request',
      body: `Hello ${user.full_name || 'User'},\n\nYou requested a password reset. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nBest regards,\npharmaLocator Security Team`,
      reset_url: resetUrl,
    });

    return {
      message: 'A secure password reset link has been sent to your email address.',
    };
  }

  async getMailSandbox() {
    return MailSandboxModel.find().sort({ created_at: -1 }).limit(10).lean();
  }

  async resetPassword(token: string, email: string, newPassword: string) {
    if (!token || !email || !newPassword) {
      throw Object.assign(new Error('Token, email, and new password are required'), {
        statusCode: 400, code: 'BAD_REQUEST',
      });
    }

    // Hash the incoming raw token to compare with DB
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const user = await UserModel.findOne({
      email: email.toLowerCase(),
      password_reset_token: tokenHash,
    }).select('+password_reset_token +password_reset_expires');

    if (!user) {
      throw Object.assign(new Error('Reset link is invalid or has already been used'), {
        statusCode: 400, code: 'INVALID_RESET_TOKEN',
      });
    }

    if (!user.password_reset_expires || user.password_reset_expires < new Date()) {
      throw Object.assign(new Error('Reset link has expired. Please request a new one'), {
        statusCode: 400, code: 'RESET_TOKEN_EXPIRED',
      });
    }

    // Update password and clear the reset token
    user.password_hash = await hashPassword(newPassword);
    user.password_reset_token = null;
    user.password_reset_expires = null;
    await user.save();

    return { message: 'Password updated successfully. You can now log in.' };
  }

  async sendOtp(_phone: string) {
    throw Object.assign(new Error('Phone OTP is not enabled'), {
      statusCode: 400,
      code: 'NOT_SUPPORTED',
    });
  }

  getGoogleAuthUrl(): string {
    if (!env.GOOGLE_CLIENT_ID) {
      throw Object.assign(new Error('Google sign-in is not configured'), {
        statusCode: 503,
        code: 'GOOGLE_NOT_CONFIGURED',
      });
    }

    const redirectUri =
      env.GOOGLE_REDIRECT_URI || `${env.API_BASE_URL}/api/v1/auth/google/callback`;

    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGoogleCallback(code: string) {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw Object.assign(new Error('Google sign-in is not configured'), {
        statusCode: 503,
        code: 'GOOGLE_NOT_CONFIGURED',
      });
    }

    const redirectUri =
      env.GOOGLE_REDIRECT_URI || `${env.API_BASE_URL}/api/v1/auth/google/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
    };

    if (!tokenRes.ok || !tokenData.access_token) {
      throw Object.assign(new Error(tokenData.error || 'Google token exchange failed'), {
        statusCode: 400,
        code: 'GOOGLE_AUTH_FAILED',
      });
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = (await profileRes.json()) as {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    if (!profileRes.ok || !profile.sub || !profile.email) {
      throw Object.assign(new Error('Failed to load Google profile'), {
        statusCode: 400,
        code: 'GOOGLE_PROFILE_FAILED',
      });
    }

    let user =
      (await UserModel.findOne({ google_id: profile.sub })) ||
      (await UserModel.findOne({ email: profile.email.toLowerCase() }));

    if (user) {
      // Existing user — link Google ID if not already set
      if (!user.google_id) user.google_id = profile.sub;
      if (profile.picture && !user.avatar_url) user.avatar_url = profile.picture;
      if (!user.full_name && profile.name) user.full_name = profile.name;
      await user.save();
    } else {
      // No account found — create user automatically (automatic sign-up)
      const rawPassword = randomBytes(32).toString('hex');
      const password_hash = await hashPassword(rawPassword);

      user = await UserModel.create({
        email: profile.email.toLowerCase(),
        password_hash,
        full_name: profile.name || 'Google User',
        google_id: profile.sub,
        avatar_url: profile.picture || null,
        role: 'patient',
      });

      // Notify admin of new signup
      try {
        const adminUser = await UserModel.findOne({ role: 'admin' }).lean();
        if (adminUser) {
          await NotificationModel.create({
            user_id: adminUser._id,
            type:    'new_user_signup',
            title:   'New User Registered',
            body:    `${user.full_name} (${user.email}) just signed up via Google.`,
            data:    { user_id: user._id.toString(), role: user.role, email: user.email },
          });
        }
      } catch (notifyErr) {
        logger.warn({ notifyErr }, 'Failed to notify admin of new Google signup — non-critical');
      }
    }

    if (!user.is_active) {
      throw Object.assign(new Error('This account has been deactivated'), {
        statusCode: 401,
        code: 'ACCOUNT_INACTIVE',
      });
    }

    const publicUser = toPublicUser(user);
    const session = buildSession(publicUser.id);

    return { user: publicUser, session };
  }
}
