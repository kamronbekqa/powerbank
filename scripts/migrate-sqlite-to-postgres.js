/**
 * One-off data migration: legacy SQLite database -> PostgreSQL.
 *
 * Carries across the data that matters, and deliberately NOTHING else:
 *   • SiteSettings (config, contacts, delivery window, penalties)
 *   • Product inventory (the real catalogue with prices/stock)
 *   • The admin account (so you can still sign in)
 *
 * It does NOT import test customers, orders, reviews, KYC records or messages —
 * those were removed as test/demo data and a fresh database should stay clean.
 *
 * Run:  node scripts/migrate-sqlite-to-postgres.js [--dry-run]
 *
 * The SQLite file is read directly with node:sqlite, so this works even after
 * the Prisma client has been switched over to PostgreSQL.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SQLITE_PATH = path.join(ROOT, 'prisma', 'dev.db');
const DRY_RUN = process.argv.includes('--dry-run');

// TARGET comes from DATABASE_URL (e.g. the production PostgreSQL instance).
// SOURCE is read explicitly so the two are never confused.
const prisma = new PrismaClient();
const SOURCE_URL = process.env.SOURCE_DATABASE_URL
  || 'postgresql://postgres:voltmaxhub_local_dev@127.0.0.1:55432/postgres?schema=public';
function openSource() {
  return new PrismaClient({ datasources: { db: { url: SOURCE_URL } } });
}

// node:sqlite is CJS-only, so reach it through createRequire.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

async function main() {
  // The legacy SQLite file is the default source. If it has been removed, fall
  // back to the current local database, which already holds the same data.
  let products, settings, admins, source;
  if (fs.existsSync(SQLITE_PATH)) {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(SQLITE_PATH, { readOnly: true });
    products = db.prepare('SELECT * FROM Product').all();
    settings = db.prepare("SELECT * FROM SiteSettings WHERE id='default'").get();
    admins = db.prepare("SELECT * FROM User WHERE role='ADMIN'").all();
    source = SQLITE_PATH;
    db.close();
  } else {
    const src = openSource();
    products = await src.product.findMany();
    settings = await src.siteSettings.findFirst({ where: { id: 'default' } });
    admins = await src.user.findMany({ where: { role: 'ADMIN' } });
    source = 'SOURCE_DATABASE_URL (SQLite file absent)';
    await src.$disconnect();
  }

  console.log(`Source       : ${source}`);
  console.log(`Target       : ${(process.env.DATABASE_URL || '').replace(/\/\/[^@]*@/, '//***@')}`);
  console.log(`Mode          : ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY'}`);
  console.log('');
  console.log('Will copy:');
  console.log(`  Products    : ${products.length}`);
  console.log(`  SiteSettings: ${settings ? 1 : 0}`);
  console.log(`  Admin users : ${admins.length}`);
  console.log('Will NOT copy (test/demo data, intentionally excluded):');
  for (const t of ['User (non-admin)', 'Order', 'Review', 'Verification', 'ContactMessage', 'Transaction']) {
    console.log(`  ${t}`);
  }
  console.log('');

  if (!products.length) console.warn('WARNING: no products found in the SQLite source.');
  if (!admins.length) console.warn('WARNING: no admin user found — you will not be able to sign in.');

  if (DRY_RUN) {
    for (const p of products.slice(0, 5)) {
      console.log(`  - ${String(p.title).slice(0, 44).padEnd(46)} buy=${p.buyPrice} rent=${p.rentPrice} stock=${p.stock}`);
    }
    if (products.length > 5) console.log(`  ... and ${products.length - 5} more`);
    db.close();
    await prisma.$disconnect();
    console.log('\nDry run complete. Re-run without --dry-run to write.');
    return;
  }

  // ── Products ───────────────────────────────────────────────────────────────
  let created = 0, updated = 0;
  for (const p of products) {
    const data = {
      id: p.id,
      title: p.title,
      category: p.category || 'GENERATOR',
      capacity: p.capacity,
      description: p.description,
      buyPrice: p.buyPrice ?? null,
      rentPrice: p.rentPrice ?? null,
      oldBuyPrice: p.oldBuyPrice ?? null,
      oldRentPrice: p.oldRentPrice ?? null,
      stock: p.stock ?? 1,
      images: p.images || '[]',
      usageSpecs: p.usageSpecs || '[]',
      isAvailable: p.isAvailable === null ? true : Boolean(p.isAvailable),
      createdAt: p.createdAt ? new Date(Number(p.createdAt)) : new Date()
    };
    const existing = await prisma.product.findUnique({ where: { id: data.id } });
    if (existing) { await prisma.product.update({ where: { id: data.id }, data }); updated++; }
    else { await prisma.product.create({ data }); created++; }
  }
  console.log(`Products    : ${created} created, ${updated} updated`);

  // ── SiteSettings ───────────────────────────────────────────────────────────
  // Keep the bot token/chat id exactly as they were so Telegram keeps working.
  if (settings) {
    const s = {
      id: 'default',
      companyName: settings.companyName ?? 'VOLTMAXHUB',
      telegram: settings.telegram ?? '',
      instagram: settings.instagram ?? '',
      phone: settings.phone ?? '',
      email: settings.email ?? '',
      address: settings.address ?? '',
      botToken: settings.botToken ?? '',
      botChatId: settings.botChatId ?? '',
      penaltyRate: settings.penaltyRate ?? null,
      legalNoticeDays: settings.legalNoticeDays ?? null,
      visitCount: settings.visitCount ?? 0,
      deliveryStartHour: settings.deliveryStartHour ?? null,
      deliveryEndHour: settings.deliveryEndHour ?? null,
      deliverySlotLabel: settings.deliverySlotLabel ?? '',
      maxRentalDays: settings.maxRentalDays ?? null,
      minRentalDays: settings.minRentalDays ?? null,
      myIdEnabled: settings.myIdEnabled === null ? true : Boolean(settings.myIdEnabled),
      myIdClientId: settings.myIdClientId ?? '',
      myIdClientSecret: settings.myIdClientSecret ?? ''
    };
    await prisma.siteSettings.upsert({ where: { id: 'default' }, update: s, create: s });
    console.log('SiteSettings: 1 row copied');
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  // Password hashes are portable (scrypt), so they move across unchanged.
  let adminCount = 0;
  for (const a of admins) {
    const data = {
      id: a.id,
      phone: a.phone,
      password: a.password,
      fullName: a.fullName ?? null,
      avatar: a.avatar ?? null,
      isVerified: a.isVerified === null ? true : Boolean(a.isVerified),
      role: 'ADMIN',
      createdAt: a.createdAt ? new Date(Number(a.createdAt)) : new Date()
    };
    const existing = await prisma.user.findUnique({ where: { id: data.id } });
    if (existing) await prisma.user.update({ where: { id: data.id }, data });
    else await prisma.user.create({ data });
    adminCount++;
  }
  console.log(`Admins      : ${adminCount} copied (password hash preserved)`);

  const counts = {
    products: await prisma.product.count(),
    settings: await prisma.siteSettings.count(),
    users: await prisma.user.count(),
    orders: await prisma.order.count(),
    reviews: await prisma.review.count(),
    verifications: await prisma.verification.count()
  };
  console.log('\nPostgreSQL now contains:');
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(14)} ${v}`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Migration failed:', error.message);
  await prisma.$disconnect();
  process.exit(1);
});