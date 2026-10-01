/**
 * Encrypt existing plaintext KYC data at rest.
 *
 * Run once after deploying the encryption code, with KYC_ENCRYPTION_KEY set:
 *   node server/scripts/encrypt-kyc.js            # dry run (reports only)
 *   node server/scripts/encrypt-kyc.js --apply    # performs the writes
 *
 * Why this exists: new writes are encrypted automatically, but rows written
 * before the feature are still plaintext. This backfills them in place.
 *
 * The key is never printed, logged or written here. Use --apply to commit.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import {
  KycCryptoError, isKeyConfigured, isEncrypted, encryptField, USER_PII_FIELDS
} from '../lib/kyc-crypto.js';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  if (!isKeyConfigured()) {
    // Never echo the env value — only the variable name and the reason.
    console.error('ERROR: KYC_ENCRYPTION_KEY is not set or is too short.');
    console.error('       Set it to 64 hex chars, base64 of 32 bytes, or 16+ characters.');
    console.error('       Aborting: refusing to touch data without a usable key.');
    process.exit(1);
  }

  console.log(`Mode: ${APPLY ? 'APPLY (will write)' : 'DRY RUN (no writes)'}`);

  const stats = { users: 0, verifications: 0, skipped: 0 };

  try {
    // ── Users ────────────────────────────────────────────────────────────────
    const users = await prisma.user.findMany({
      select: { id: true, ...Object.fromEntries(USER_PII_FIELDS.map(f => [f, true])) }
    });
    for (const user of users) {
      const data = {};
      let dirty = false;
      for (const field of USER_PII_FIELDS) {
        const value = user[field];
        if (!value || isEncrypted(value)) continue;      // empty or already done
        data[field] = encryptField(value);
        dirty = true;
      }
      if (!dirty) continue;
      if (APPLY) await prisma.user.update({ where: { id: user.id }, data });
      stats.users++;
    }

    // ── Verifications ────────────────────────────────────────────────────────
    const verifications = await prisma.verification.findMany({
      select: { id: true, ...Object.fromEntries(USER_PII_FIELDS.map(f => [f, true])) }
    });
    for (const record of verifications) {
      const data = {};
      let dirty = false;
      for (const field of USER_PII_FIELDS) {
        const value = record[field];
        if (!value || isEncrypted(value)) continue;
        data[field] = encryptField(value);
        dirty = true;
      }
      if (!dirty) continue;
      if (APPLY) await prisma.verification.update({ where: { id: record.id }, data });
      stats.verifications++;
    }

    console.log(`\nUsers encrypted       : ${stats.users}`);
    console.log(`Verifications encrypted: ${stats.verifications}`);
    console.log(`Already encrypted/empty skipped: ${stats.skipped}`);
    if (!APPLY) {
      console.log('\nThis was a DRY RUN. Re-run with --apply to write the changes.');
    }
  } catch (error) {
    if (error instanceof KycCryptoError) {
      // code only — never the key, never the data
      console.error(`ERROR: crypto operation failed (${error.code}). Nothing was written.`);
      process.exit(1);
    }
    console.error('ERROR: migration failed — nothing was written.');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();