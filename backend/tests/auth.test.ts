import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import type { Application } from 'express';

let app: Application;

beforeAll(() => {
  app = createApp();
});

// ─── Register ─────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('returns 400 (VALIDATION_ERROR) when body is empty', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com',
      password: 'short',
      full_name: 'Test User',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when password has no uppercase letter', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com',
      password: 'password1',
      full_name: 'Test User',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    const detail = res.body.details?.find((d: { field: string }) => d.field.includes('password'));
    expect(detail).toBeDefined();
  });

  it('returns 400 when password has no digit', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com',
      password: 'PasswordNoDigit',
      full_name: 'Test User',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when email is invalid', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'not-an-email',
      password: 'Password1',
      full_name: 'Test User',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when full_name is too short', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com',
      password: 'Password1',
      full_name: 'A', // min 2 chars
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when pharmacy_staff role is missing pharmacy object', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'staff@example.com',
      password: 'Password1!',
      full_name: 'Staff User',
      role: 'pharmacy_staff',
      // pharmacy object intentionally missing
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    const hasPharmacyError = res.body.details?.some(
      (d: { field: string; message: string }) =>
        d.field.includes('pharmacy') || d.message.toLowerCase().includes('pharmacy')
    );
    expect(hasPharmacyError).toBe(true);
  });

  it('returns 400 when phone is not in E.164 format', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com',
      password: 'Password1',
      full_name: 'Test User',
      phone: '08012345678', // missing +country code
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  it('returns 400 when neither email+password nor phone+otp is provided', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when email is provided but password is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'patient@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when password is provided but email is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: 'Password1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for malformed email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'Password1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when phone is provided without OTP', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '+2348012345678' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when OTP is not exactly 6 digits', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '+2348012345678', otp: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  it('returns 401 when called without Authorization header', async () => {
    const res = await request(app).post('/api/v1/auth/logout').send();
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when Authorization header has invalid JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', 'Bearer invalid.token.here')
      .send();
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── Token Refresh ────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/refresh', () => {
  it('returns 400 when refresh_token is missing', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when refresh_token is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: 'this-is-not-a-valid-token' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('REFRESH_TOKEN_INVALID');
  });
});

// ─── Forgot Password ─────────────────────────────────────────────────────────

describe('POST /api/v1/auth/forgot-password', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when email is malformed', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when redirect_to is not a valid URL', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'test@example.com', redirect_to: 'not-a-url' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  // Anti-enumeration: always returns 200 regardless of whether email exists
  // (we can't test the "email exists" path without a live Supabase connection)
});

// ─── Reset Password ───────────────────────────────────────────────────────────

describe('POST /api/v1/auth/reset-password', () => {
  it('returns 400 when token is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ new_password: 'NewPassword1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when new_password is too weak', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'some-token', new_password: 'weak' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when new_password has no uppercase letter', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'some-token', new_password: 'nouppercase1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for an invalid or expired token (Supabase error)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'invalid-expired-token', new_password: 'ValidPass1' });
    // Supabase will reject the token — service should propagate as 400
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── Send OTP ─────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/send-otp', () => {
  it('returns 400 when phone is missing', async () => {
    const res = await request(app).post('/api/v1/auth/send-otp').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when phone is not in E.164 format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '08012345678' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when phone has letters', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+234abc45678' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────

describe('Rate limiting on auth endpoints', () => {
  it('applies the globalRateLimiter on /api/v1 routes (smoke test)', async () => {
    // Just ensure the route exists and doesn't crash — actual rate limit
    // testing would require a mock clock or Redis store
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'test@example.com',
      password: 'Password1',
    });
    // Should be 401 (invalid creds, Supabase rejects) not 500
    expect([400, 401, 429]).toContain(res.status);
  });
});
