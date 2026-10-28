import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { initSentry } from './config/sentry';
import { connectMongo, disconnectMongo } from './config/mongo';
import mongoose from 'mongoose';

// ── Default banner URLs for seeded pharmacies ────────────────────────────────
const PHARMACY_BANNERS: Record<string, string> = {
  'Ethio-Medical Pharmacy':
    'https://images.unsplash.com/photo-1576091160550-2173bdb999ef?auto=format&fit=crop&q=80&w=800',
  'Red Cross Pharmacy':
    'https://images.unsplash.com/photo-1538108149393-fdfd81895907?auto=format&fit=crop&q=80&w=800',
  'Kenema Pharmacy':
    'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=800',
  'Lion Pharmacy':
    'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&q=80&w=800',
};

/**
 * Restores logo_url for any seeded pharmacy whose banner was accidentally cleared.
 * Only fills in a value when logo_url is null / undefined / empty string.
 * Never overwrites a banner that was intentionally set by staff.
 */
async function restoreBanners(): Promise<void> {
  try {
    const col = mongoose.connection.collection('pharmacies');
    for (const [name, url] of Object.entries(PHARMACY_BANNERS)) {
      await col.updateOne(
        { name, $or: [{ logo_url: null }, { logo_url: '' }, { logo_url: { $exists: false } }] },
        { $set: { logo_url: url, updated_at: new Date() } }
      );
    }
  } catch (err) {
    // Non-fatal
  }
}

async function bootstrap(): Promise<void> {
  initSentry();

  const app = createApp();
  const port = env.PORT;

  const server = app.listen(port, () => {
    console.log(`server is running on ${port}`);
  });

  try {
    await connectMongo();
    console.log('db is connected');
    // Restore any accidentally-cleared pharmacy banners
    await restoreBanners();
  } catch (err) {
    logger.error({ err }, 'MongoDB connection failed — check MONGODB_URI');
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received — closing server gracefully');
    server.close(async () => {
      await disconnectMongo();
      logger.info('HTTP server closed');
      process.exit(0);
    });

    setTimeout(() => {
      logger.warn('Forcing process exit after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — exiting');
    process.exit(1);
  });
}

bootstrap();
