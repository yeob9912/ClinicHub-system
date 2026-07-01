/**
 * One-time helper: create an admin user in MongoDB.
 * Run: npx ts-node scripts/seed-admin.ts
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { connectMongo, disconnectMongo } from '../src/config/mongo';
import { UserModel } from '../src/models/User';
import { hashPassword } from '../src/utils/password';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@healthpay.org';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Password1';
const ADMIN_NAME = process.env.ADMIN_NAME || 'System Admin';

async function main() {
  await connectMongo();

  const existing = await UserModel.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    existing.role = 'admin';
    existing.is_active = true;
    await existing.save();
    console.log(`Updated existing user to admin: ${ADMIN_EMAIL}`);
  } else {
    const password_hash = await hashPassword(ADMIN_PASSWORD);
    await UserModel.create({
      email: ADMIN_EMAIL.toLowerCase(),
      password_hash,
      full_name: ADMIN_NAME,
      role: 'admin',
    });
    console.log(`Created admin: ${ADMIN_EMAIL}`);
  }

  await disconnectMongo();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
