import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export async function connectMongo(): Promise<void> {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME,
  });

  logger.info({ db: mongoose.connection.name }, 'MongoDB connected');
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
