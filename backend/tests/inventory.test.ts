import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import type { Application } from 'express';

let app: Application;

// Valid 24-char MongoDB ObjectId hex strings
const PHARMACY_ID = '000000000000000000000001';
const MEDICINE_ID = '000000000000000000000002';
const INV_ID      = '000000000000000000000003';

beforeAll(() => {
  app = createApp();
});

describe('Inventory validation', () => {
  it('POST /pharmacies/:id/inventory → 401 without valid token', async () => {
    const res = await request(app)
      .post(`/api/v1/pharmacies/${PHARMACY_ID}/inventory`)
      .set('Authorization', 'Bearer fake-token-will-401')
      .send({ medicine_id: MEDICINE_ID, price: -5, stock_quantity: 10 });
    // Auth middleware fires before validation; fake token → 401
    expect([400, 401]).toContain(res.status);
  });

  it('PATCH /pharmacies/:id/inventory/:inv_id → 401 without token', async () => {
    const res = await request(app)
      .patch(`/api/v1/pharmacies/${PHARMACY_ID}/inventory/${INV_ID}`)
      .send({ price: 750 });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /pharmacies/:id/inventory/bulk → 401 without token', async () => {
    const res = await request(app)
      .post(`/api/v1/pharmacies/${PHARMACY_ID}/inventory/bulk`)
      .send({ items: [{ medicine_id: MEDICINE_ID, price: 500, stock_quantity: 20 }] });
    expect(res.status).toBe(401);
  });
});

describe('Medicine search validation', () => {
  it('GET /medicines/search → 400 or 401 when q is missing', async () => {
    const res = await request(app)
      .get('/api/v1/medicines/search')
      .set('Authorization', 'Bearer fake-token');
    expect([400, 401]).toContain(res.status);
  });

  it('GET /medicines → 401 without auth', async () => {
    const res = await request(app).get('/api/v1/medicines');
    expect(res.status).toBe(401);
  });
});

describe('Admin endpoints', () => {
  it('GET /admin/stats → 401 without token', async () => {
    const res = await request(app).get('/api/v1/admin/stats');
    expect(res.status).toBe(401);
  });

  it('POST /admin/medicines → 401 without token', async () => {
    const res = await request(app).post('/api/v1/admin/medicines').send({
      name: 'Test Medicine',
      category: 'Antibiotics',
    });
    expect(res.status).toBe(401);
  });

  it('PATCH /admin/pharmacies/:id/approve → 401 without token', async () => {
    const res = await request(app).patch(
      `/api/v1/admin/pharmacies/${PHARMACY_ID}/approve`
    );
    expect(res.status).toBe(401);
  });
});

describe('Pagination utilities', () => {
  it('parsePagination clamps to valid range', async () => {
    const { parsePagination } = await import('../src/utils/pagination');
    const result = parsePagination('0', '999', 50);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
  });

  it('buildPaginationMeta computes totalPages correctly', async () => {
    const { buildPaginationMeta } = await import('../src/utils/pagination');
    const meta = buildPaginationMeta(100, 2, 20);
    expect(meta.totalPages).toBe(5);
    expect(meta.hasNextPage).toBe(true);
    expect(meta.hasPrevPage).toBe(true);
  });

  it('buildPaginationMeta last page has no next page', async () => {
    const { buildPaginationMeta } = await import('../src/utils/pagination');
    const meta = buildPaginationMeta(40, 2, 20);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPrevPage).toBe(true);
  });
});
