import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { logger } from './config/logger';
import { swaggerSpec } from './config/swagger';
import { requestId } from './middleware/requestId';
import { globalRateLimiter } from './middleware/rateLimiter';
import { authMiddleware } from './middleware/auth';
import { roleGuard } from './middleware/roleGuard';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { pharmaciesRouter } from './modules/pharmacies/pharmacies.routes';
import { medicinesRouter } from './modules/medicines/medicines.routes';
import { inventoryRouter } from './modules/inventory/inventory.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { ordersRouter } from './modules/orders/orders.routes';
import { chatsRouter } from './modules/chats/chats.routes';
import { callsRouter } from './modules/calls/calls.routes';
import { receiptsRouter } from './modules/receipts/receipts.routes';
import { salesRouter } from './modules/sales/sales.routes';
import { complaintsRouter } from './modules/complaints/complaints.routes';

export function createApp(): Application {
  const app = express();

  // ─── Trust Proxy (Railway / Render behind load balancer) ──────────────────
  app.set('trust proxy', 1);

  // ─── Security Headers ─────────────────────────────────────────────────────
  // Disable CSP for /api-docs so Swagger UI assets load correctly
  app.use(
    helmet({
      contentSecurityPolicy:
        env.NODE_ENV === 'production'
          ? {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
                styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
                imgSrc: ["'self'", 'data:', 'cdn.jsdelivr.net'],
              },
            }
          : false, // Disabled in dev so Swagger UI loads freely
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // ─── CORS ─────────────────────────────────────────────────────────────────
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true); // allow non-browser (Postman, curl)
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        callback(new Error(`CORS policy blocked origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      exposedHeaders: ['X-Request-ID', 'Retry-After'],
    })
  );

  // ─── Body Parsing ─────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ─── Request Telemetry ────────────────────────────────────────────────────
  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res) =>
        res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      customSuccessMessage: (req, res) =>
        `${req.method} ${req.url} → ${res.statusCode}`,
      redact: ['req.headers.authorization'],
    })
  );

  // ─── Request ID ───────────────────────────────────────────────────────────
  app.use(requestId);

  // ─── Rate Limiting ────────────────────────────────────────────────────────
  app.use('/api/v1', globalRateLimiter);

  // ─── Health Check ─────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'smart-pharmacy-api',
      version: '1.0.0',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // ─── OpenAPI / Swagger UI ─────────────────────────────────────────────────
  // Serve the raw JSON spec at /api-docs.json
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve the interactive Swagger UI at /api-docs
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: 'Smart Pharmacy API Docs',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,           // keep Bearer token across page reloads
        displayRequestDuration: true,
        docExpansion: 'none',                 // collapse all sections by default
        filter: true,                         // enable search/filter bar
        tryItOutEnabled: false,               // show explicit "Try it out" button per endpoint
        supportedSubmitMethods: ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'],
        defaultModelsExpandDepth: 2,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customCss: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin-bottom: 24px; }
        .swagger-ui .info .title { color: #1a73e8; }
        .swagger-ui .scheme-container { background: #f8f9fa; padding: 12px 16px; border-radius: 4px; }
        .swagger-ui .opblock-tag { font-size: 16px; font-weight: 600; }
        .swagger-ui .opblock.opblock-post .opblock-summary { border-color: #49cc90; }
        .swagger-ui .opblock.opblock-get .opblock-summary { border-color: #61affe; }
        .swagger-ui .opblock.opblock-put .opblock-summary { border-color: #fca130; }
        .swagger-ui .opblock.opblock-patch .opblock-summary { border-color: #50e3c2; }
        .swagger-ui .opblock.opblock-delete .opblock-summary { border-color: #f93e3e; }
      `,
    })
  );

  // ─── API Routes ───────────────────────────────────────────────────────────

  // Auth — public (rate limiters are applied per-route inside authRouter)
  app.use('/api/v1/auth', authRouter);

  // Users — require JWT
  app.use('/api/v1/users', authMiddleware, usersRouter);

  // Pharmacies — GET (list/nearby/byId) are public; writes require JWT
  app.use('/api/v1/pharmacies', pharmaciesRouter);
  app.use('/api/v1/pharmacies/:pharmacy_id/inventory', inventoryRouter);

  // Medicines — writes require JWT, GET routes are public
  app.use('/api/v1/medicines', medicinesRouter);

  // Watchlist & Notifications — require JWT (router mounts both /watchlist and /notifications)
  app.use('/api/v1', authMiddleware, notificationsRouter);

  // Orders — require JWT
  app.use('/api/v1/orders', authMiddleware, ordersRouter);

  // Chats — require JWT
  app.use('/api/v1/chats', authMiddleware, chatsRouter);

  // Calls — require JWT
  app.use('/api/v1/calls', authMiddleware, callsRouter);

  // Receipts — require JWT (staff)
  app.use('/api/v1/receipts', authMiddleware, receiptsRouter);

  // Sales — require JWT (staff)
  app.use('/api/v1/sales', authMiddleware, salesRouter);

  // Admin — require JWT + admin role
  app.use('/api/v1/admin', authMiddleware, roleGuard('admin'), adminRouter);

  // Complaints — user submit/list (auth only); admin routes are in adminRouter
  app.use('/api/v1/complaints', complaintsRouter);

  // ─── 404 & Error Handlers (always last) ──────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
