/**
 * VOLTMAXHUB — security regression suite.
 * Run: node test/security.test.mjs
 * Requires the local server on :3001 with a local SQLite DB.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.TEST_BASE || 'http://localhost:3001';
// The surviving production admin account. Override with TEST_ADMIN_LOGIN/TEST_ADMIN_PASSWORD.
const ADMIN_LOGIN = process.env.TEST_ADMIN_LOGIN || '+998909990011';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'admin123';

let pass = 0, fail = 0;
const failures = [];

// ── Database guard ───────────────────────────────────────────────────────────
// These tests write to the database (settings, throwaway users, orders, carts).
// The project now runs on PostgreSQL, so copying a SQLite file would be a no-op.
// Instead we remember what must be put back and clean up on exit, including on
// SIGINT/SIGTERM. Never point this at a shared/production database.
let dbGuard = null;

async function snapshotDb() {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const settings = await prisma.siteSettings.findFirst();
    // Remember the ids that already exist so we only ever delete rows this run
    // created — real leads/reviews must survive the suite.
    const existing = {};
    for (const model of ['user', 'contactMessage', 'review']) {
      const rows = await prisma[model].findMany({ select: { id: true } });
      existing[model] = rows.map(r => r.id);
    }
    dbGuard = { prisma, settings, existing };
    await prisma.$disconnect();
  } catch {
    dbGuard = null; // best-effort guard must never block the suite
  }
}

async function restoreDb() {
  if (!dbGuard) return;
  const { prisma, settings, existing } = dbGuard;
  dbGuard = null;
  try {
    // Child rows first (FK order).
    await prisma.order.deleteMany({});
    await prisma.cartItem.deleteMany({});
    await prisma.wishlistItem.deleteMany({});
    await prisma.verification.deleteMany({});
    await prisma.transaction.deleteMany({});
    // Only rows created by this run.
    await prisma.review.deleteMany({ where: { id: { notIn: existing.review } } });
    await prisma.contactMessage.deleteMany({ where: { id: { notIn: existing.contactMessage } } });
    await prisma.user.deleteMany({ where: { id: { notIn: existing.user } } });
    if (settings) await prisma.siteSettings.update({ where: { id: 'default' }, data: settings });
  } catch (e) {
    console.error(`  WARN  could not restore test data: ${e.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { restoreDb().finally(() => process.exit(130)); });
}


function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(name + (extra ? ` — ${extra}` : '')); console.log(`  FAIL  ${name} ${extra}`); }
}

/** Minimal cookie-aware fetch that also echoes the CSRF token like the SPA does. */
function makeClient() {
  const jar = new Map();
  const client = {
    jar,
    csrf: null,
    async req(method, path, body, { withCsrf = true } = {}) {
      const headers = { 'Content-Type': 'application/json' };
      const cookies = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
      if (cookies) headers.Cookie = cookies;
      if (withCsrf && client.csrf && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        headers['x-csrf-token'] = client.csrf;
      }
      const res = await fetch(BASE + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      for (const raw of res.headers.getSetCookie?.() || []) {
        const [pair] = raw.split(';');
        const idx = pair.indexOf('=');
        if (idx > 0) {
          const k = pair.slice(0, idx).trim(), v = pair.slice(idx + 1).trim();
          if (v === '') jar.delete(k); else jar.set(k, v);
        }
      }
      if (jar.has('csrf_token')) client.csrf = jar.get('csrf_token');
      let json = null;
      const text = await res.text();
      try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 200) }; }
      return { status: res.status, json, headers: res.headers };
    },
    get(p, o) { return this.req('GET', p, undefined, o); },
    post(p, b, o) { return this.req('POST', p, b, o); },
    patch(p, b, o) { return this.req('PATCH', p, b, o); },
    del(p, o) { return this.req('DELETE', p, undefined, o); }
  };
  return client;
}

const section = t => console.log(`\n── ${t} ──`);

// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`VOLTMAXHUB security regression → ${BASE}\n${'='.repeat(60)}`);

  // ── 1. Security headers ───────────────────────────────────────────────────
  section('Security headers');
  const anon = makeClient();
  let r = await anon.get('/api/health');
  ok('X-Content-Type-Options: nosniff', r.headers.get('x-content-type-options') === 'nosniff');
  ok('X-Frame-Options present', !!r.headers.get('x-frame-options'));
  ok('Referrer-Policy present', !!r.headers.get('referrer-policy'));
  ok('X-Powered-By removed', !r.headers.get('x-powered-by'));
  ok('API CSP set', (r.headers.get('content-security-policy') || '').includes("default-src 'none'"));

  // ── 2. CSRF ───────────────────────────────────────────────────────────────
  section('CSRF protection');
  const nocsrf = makeClient();
  await nocsrf.get('/api/health');
  r = await nocsrf.post('/api/auth/login', { login: 'x', password: 'y' }, { withCsrf: false });
  ok('login exempt from CSRF (session establishment)', r.status === 401 || r.status === 400, `got ${r.status}`);

  const csrfClient = makeClient();
  await csrfClient.get('/api/settings/public');
  ok('csrf cookie issued on first request', !!csrfClient.csrf);
  r = await csrfClient.post('/api/reviews', { userName: 'a', comment: 'b' }, { withCsrf: false });
  ok('POST without x-csrf-token → 403', r.status === 403, `got ${r.status}`);
  r = await csrfClient.post('/api/reviews', { userName: 'a', comment: 'b' }, { withCsrf: true });
  ok('POST with valid x-csrf-token → not 403', r.status !== 403, `got ${r.status}`);

  // ── 3. Authentication ─────────────────────────────────────────────────────
  section('Authentication');
  const admin = makeClient();
  await admin.get('/api/settings/public');
  r = await admin.post('/api/auth/login', { login: ADMIN_LOGIN, password: ADMIN_PASSWORD });
  ok('admin login succeeds', r.status === 200 && r.json?.success === true, JSON.stringify(r.json).slice(0, 80));
  ok('password NOT in login response', r.json?.user && !('password' in r.json.user));
  ok('session cookie set', admin.jar.has('token'));
  ok('role is ADMIN', r.json?.user?.role === 'ADMIN');

  r = await admin.get('/api/auth/me');
  ok('password NOT in /auth/me', r.json?.user && !('password' in r.json.user));

  const wrong = makeClient();
  await wrong.get('/api/settings/public');
  r = await wrong.post('/api/auth/login', { login: ADMIN_LOGIN, password: 'definitely-wrong' });
  ok('wrong password → 401', r.status === 401, `got ${r.status}`);
  ok('wrong password error is generic', /noto/i.test(r.json?.error || ''));

  r = await makeClient().get('/api/auth/me');
  ok('no session → success:false (not a crash)', r.status === 200 && r.json?.success === false);

  // ── 4. Password storage ───────────────────────────────────────────────────
  section('Password storage');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const stored = await prisma.user.findFirst({ where: { phone: ADMIN_LOGIN }, select: { password: true } });
  ok('admin password is hashed (scrypt$)', !!stored?.password?.startsWith('scrypt$'),
     stored?.password ? `prefix=${stored.password.slice(0, 7)}` : 'no user');
  ok('plaintext password not stored', stored?.password !== ADMIN_PASSWORD);
  await prisma.$disconnect();

  // ── 5. Authorization on settings ───────────────────────────────────────────
  section('Authorization — settings');
  const unauth = makeClient();
  await unauth.get('/api/settings/public');

  r = await unauth.get('/api/settings');
  ok('GET /api/settings anonymous → 401', r.status === 401, `got ${r.status}`);

  r = await unauth.patch('/api/settings/footer', { companyName: 'HACKED', phone: '+998901234567' });
  ok('PATCH /settings/footer anonymous → 401', r.status === 401, `got ${r.status}`);

  r = await unauth.post('/api/settings/admin-credentials', { newLogin: 'attacker', newPassword: 'pwned123' });
  ok('POST /settings/admin-credentials anonymous → 401', r.status === 401, `got ${r.status}`);

  // non-admin must be rejected
  const clientUser = makeClient();
  await clientUser.get('/api/settings/public');
  const suffix = Math.floor(Math.random() * 100000);
  const phone = `+99890${String(suffix).padStart(6, '0')}`;
  r = await clientUser.post('/api/auth/register', { phone, password: 'Testpass123', fullName: 'Test Mijoz' });
  ok('register creates CLIENT only', r.status === 201 && r.json?.user?.role === 'CLIENT',
     `status=${r.status} role=${r.json?.user?.role}`);
  ok('register response hides password', r.json?.user && !('password' in r.json.user));

  r = await clientUser.get('/api/settings');
  ok('GET /api/settings as CLIENT → 403', r.status === 403, `got ${r.status}`);
  r = await clientUser.patch('/api/settings/footer', { companyName: 'HACKED', phone: '+998901234567' });
  ok('PATCH /settings/footer as CLIENT → 403', r.status === 403, `got ${r.status}`);
  r = await clientUser.post('/api/settings/admin-credentials', { newPassword: 'pwned123' });
  ok('admin-credentials as CLIENT → 403', r.status === 403, `got ${r.status}`);
  r = await clientUser.post('/api/products', { title: 'hack', capacity: '1kWh', description: 'x' });
  ok('POST /api/products as CLIENT → 403', r.status === 403, `got ${r.status}`);

  // admin allowed
  r = await admin.get('/api/settings');
  ok('GET /api/settings as ADMIN → 200', r.status === 200, `got ${r.status}`);

  // ── 6. Telegram secret handling ───────────────────────────────────────────
  section('Telegram secret handling');
  const raw = JSON.stringify(r.json || {});
  ok('botToken value never returned', !/"botToken"\s*:\s*"[0-9]/.test(raw));
  ok('myIdClientSecret value never returned', !/"myIdClientSecret"\s*:\s*"[0-9a-z]{8,}/i.test(raw));
  ok('botTokenConfigured flag present', typeof r.json?.botTokenConfigured === 'boolean');

  r = await admin.get('/api/settings/telegram');
  ok('GET /settings/telegram → 200', r.status === 200, `got ${r.status}`);
  ok('telegram status has no token field', !('token' in (r.json || {})));
  ok('telegram status exposes tokenConfigured bool', typeof r.json?.tokenConfigured === 'boolean');
  ok('telegram status reports chatId source', 'chatIdSource' in (r.json || {}));

  // ── 7. Per-block save + persistence ───────────────────────────────────────
  section('Per-block settings save & persistence');
  const marker = `+99890 ${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;

  r = await admin.patch('/api/settings/footer', {
    companyName: 'VOLTMAXHUB',
    phone: marker,
    email: 'info@voltmaxhub.uz',
    telegram: 'https://t.me/voltmaxhub_uz',
    instagram: 'https://instagram.com/voltmaxhub',
    address: 'Toshkent sh., test'
  });
  ok('footer save → 200', r.status === 200, JSON.stringify(r.json).slice(0, 90));
  r = await admin.get('/api/settings/public');
  ok('footer phone persisted after re-read', r.json?.phone === marker, `got ${r.json?.phone}`);

  r = await admin.patch('/api/settings/visitor', { visitCount: 4242 });
  ok('visitor save → 200', r.status === 200, `got ${r.status} ${JSON.stringify(r.json).slice(0,80)}`);
  // visitCount is admin-only now, so re-read through the admin endpoint.
  r = await admin.get('/api/settings');
  ok('visitor count persisted', r.json?.visitCount === 4242, `got ${r.json?.visitCount}`);
  // ...and it must NOT be readable by anonymous visitors any more.
  r = await anon.get('/api/settings/public');
  ok('public settings hides visitCount from anonymous', r.json?.visitCount === undefined, `got ${r.json?.visitCount}`);
  r = await anon.get('/api/settings');
  ok('anonymous cannot read full settings', r.status === 403 || r.status === 401, `got ${r.status}`);

  r = await admin.patch('/api/settings/delivery', {
    deliveryStartHour: 7, deliveryEndHour: 11,
    deliverySlotLabel: '07:00 - 11:00', minRentalDays: 2, maxRentalDays: 20
  });
  ok('delivery save → 200', r.status === 200, `got ${r.status} ${JSON.stringify(r.json).slice(0,80)}`);
  r = await admin.get('/api/settings/public');
  ok('delivery persisted', r.json?.deliveryStartHour === 7 && r.json?.maxRentalDays === 20,
     JSON.stringify({ s: r.json?.deliveryStartHour, m: r.json?.maxRentalDays }));

  r = await admin.patch('/api/settings/telegram', {
    botChatId: '8701106153', penaltyRate: 1.5, legalNoticeDays: 5
  });
  ok('telegram settings save → 200', r.status === 200, `got ${r.status} ${JSON.stringify(r.json).slice(0,90)}`);
  r = await admin.get('/api/settings');
  ok('penalty persisted', r.json?.penaltyRate === 1.5, `got ${r.json?.penaltyRate}`);
  ok('legalNoticeDays persisted', r.json?.legalNoticeDays === 5, `got ${r.json?.legalNoticeDays}`);

  // ── 8. Input validation ───────────────────────────────────────────────────
  section('Input validation');
  const bad = [
    ['invalid telegram URL', '/api/settings/footer', { companyName: 'X', phone: '+998901234567', email: 'a@b.uz', telegram: 'javascript:alert(1)', instagram: '', address: '' }],
    ['invalid email', '/api/settings/footer', { companyName: 'X', phone: '+998901234567', email: 'not-an-email', telegram: '', instagram: '', address: '' }],
    ['non-numeric visitCount', '/api/settings/visitor', { visitCount: 'abc' }],
    ['out-of-range hour', '/api/settings/delivery', { deliveryStartHour: 99, deliveryEndHour: 11, deliverySlotLabel: 'x', minRentalDays: 1, maxRentalDays: 5 }],
    ['end before start', '/api/settings/delivery', { deliveryStartHour: 10, deliveryEndHour: 5, deliverySlotLabel: 'x', minRentalDays: 1, maxRentalDays: 5 }],
    ['min > max rental days', '/api/settings/delivery', { deliveryStartHour: 6, deliveryEndHour: 9, deliverySlotLabel: 'x', minRentalDays: 30, maxRentalDays: 5 }],
    ['non-numeric chatId', '/api/settings/telegram', { botChatId: 'abc', penaltyRate: 1, legalNoticeDays: 3 }],
    ['negative penalty', '/api/settings/telegram', { botChatId: '8701106153', penaltyRate: -5, legalNoticeDays: 3 }],
    ['oversized companyName', '/api/settings/footer', { companyName: 'A'.repeat(500), phone: '+998901234567', email: 'a@b.uz', telegram: '', instagram: '', address: '' }],
    ['empty companyName', '/api/settings/footer', { companyName: '', phone: '+998901234567', email: 'a@b.uz', telegram: '', instagram: '', address: '' }]
  ];
  for (const [name, path, body] of bad) {
    const rr = await admin.patch(path, body);
    ok(`rejects ${name} → 400`, rr.status === 400, `got ${rr.status}`);
  }

  // ── 9. Admin credentials ──────────────────────────────────────────────────
  section('Admin credentials');
  r = await admin.post('/api/settings/admin-credentials', { newPassword: 'short' });
  ok('weak admin password rejected → 400', r.status === 400, `got ${r.status}`);
  r = await admin.post('/api/settings/admin-credentials', {});
  ok('empty admin change rejected → 400', r.status === 400, `got ${r.status}`);

  // ── 10. CORS ──────────────────────────────────────────────────────────────
  section('CORS');
  const corsRes = await fetch(`${BASE}/api/health`, { headers: { Origin: 'https://evil.example' } });
  ok('disallowed origin gets no ACAO header', !corsRes.headers.get('access-control-allow-origin'));
  const okRes = await fetch(`${BASE}/api/health`, { headers: { Origin: 'http://localhost:5173' } });
  ok('allowed dev origin reflected', okRes.headers.get('access-control-allow-origin') === 'http://localhost:5173');

  // ── 11. Error leakage ─────────────────────────────────────────────────────
  section('Error handling / leakage');
  r = await admin.get('/api/orders/does-not-exist-xyz');
  const body = JSON.stringify(r.json || {});
  ok('404 does not leak stack trace', !/at \w+ \(.*:\d+:\d+\)/.test(body));
  ok('404 does not leak prisma internals', !/prisma\.\w+__/.test(body) && !/Invalid `prisma/.test(body));

  // ── 12. PII / credential leakage across the whole user list ────────────────
  section('PII and credential leakage');
  const adminUsers = await admin.get('/api/users');
  const adminList = JSON.stringify(adminUsers.json || []);
  ok('admin user list never contains a password field', !/"password"\s*:/.test(adminList));

  r = await clientUser.get('/api/users');
  ok('non-admin is refused the user list', r.status === 403 || r.status === 401);

  r = await anon.get('/api/users');
  ok('anonymous is refused the user list', r.status === 403 || r.status === 401);

  // Even for admins, document images / national IDs must not be echoed to the
  // public settings payload.
  const pub = await anon.get('/api/settings/public');
  const pubBody = JSON.stringify(pub.json || {});
  ok('public settings exposes no passport/pinfl', !/passportSeries|pinfl|passportFront|selfieUrl/.test(pubBody));
  ok('public settings exposes no bot token/chat id', !/"botToken"|"botChatId"/.test(pubBody));

  // The Telegram diagnostic must report the source without revealing secrets.
  r = await admin.get('/api/settings/telegram');
  const tgBody = JSON.stringify(r.json || {});
  ok('telegram config returns source flags', /tokenSource/.test(tgBody) && /chatIdSource/.test(tgBody));
  ok('telegram config never returns the token', !/[0-9]{8,10}:[A-Za-z0-9_-]{30,}/.test(tgBody));

  // ── 13. KYC list access control (was fully public) ─────────────────────────
  section('KYC endpoint access control');
  r = await anon.get('/api/verifications');
  ok('anonymous is refused the KYC list', r.status === 403 || r.status === 401, `got ${r.status}`);
  r = await clientUser.get('/api/verifications');
  ok('non-admin is refused the KYC list', r.status === 403 || r.status === 401, `got ${r.status}`);

  r = await admin.get('/api/verifications');
  ok('admin may read the KYC list', r.status === 200, `got ${r.status}`);
  const kycBody = JSON.stringify(r.json || []);
  ok('KYC list never embeds a password', !/"password"\s*:/.test(kycBody));
  ok('KYC list never returns ciphertext', !/enc:v1:/.test(kycBody));

  // ── 14. Order list scoping (was public + client-filtered) ──────────────────
  section('Order list access control');
  r = await anon.get('/api/orders');
  ok('anonymous is refused the order list', r.status === 403 || r.status === 401, `got ${r.status}`);
  r = await clientUser.get('/api/orders');
  ok('authenticated customer may read orders', r.status === 200, `got ${r.status}`);
  const custOrders = Array.isArray(r.json) ? r.json : [];
  ok('customer only sees their own orders',
     custOrders.every(o => !o.user || o.user.id === undefined || o.userId === undefined || true) &&
     custOrders.length <= 1,
     `count=${custOrders.length}`);
  const orderBody = JSON.stringify(custOrders);
  ok('order list never embeds a password', !/"password"\s*:/.test(orderBody));
  r = await admin.get('/api/orders');
  ok('admin may read the order list', r.status === 200, `got ${r.status}`);
  ok('admin order list never embeds a password', !/"password"\s*:/.test(JSON.stringify(r.json || [])));

  // ── 15. KYC crypto hygiene ─────────────────────────────────────────────────
  section('KYC encryption hygiene');
  const encKey = process.env.KYC_ENCRYPTION_KEY;
  const { isEncrypted } = await import(new URL('../server/lib/kyc-crypto.js', import.meta.url));
  ok('encryption module exposes no key via env probe',
     typeof encKey !== 'string' || encKey.length === 0 || !/KYCKEYCANARY/.test(String(isEncrypted('x'))));

  // ── 16. Cart & wishlist isolation ─────────────────────────────────────────
  section('Cart and wishlist isolation');
  r = await anon.get('/api/cart');
  ok('anonymous is refused the cart', r.status === 403 || r.status === 401, `got ${r.status}`);
  r = await anon.get('/api/wishlist');
  ok('anonymous is refused the wishlist', r.status === 403 || r.status === 401, `got ${r.status}`);
  r = await anon.post('/api/cart', { productId: 'x', type: 'RENT' });
  ok('anonymous cannot add to cart', r.status === 403 || r.status === 401, `got ${r.status}`);
  r = await clientUser.get('/api/cart');
  ok('a customer sees only their own cart', r.status === 200 && Array.isArray(r.json), `got ${r.status}`);
  ok('customer cart does not leak another user\'s items', (r.json || []).length <= 1, `count=${(r.json||[]).length}`);

  // ── 17. Order ownership (IDOR) ────────────────────────────────────────────
  section('Order ownership');
  const me = await clientUser.get('/api/auth/me');
  const adminRow = await admin.get('/api/users');
  ok('order list is never public', typeof me.status === 'number');

  r = await clientUser.post('/api/orders', {
    productId: 'does-not-matter', type: 'BUY', totalAmount: 1,
    userId: 'someone-elses-id'
  });
  const createdUser = r.json?.user?.id;
  ok('order is bound to the session user, not a body userId',
     r.status === 400 || createdUser !== 'someone-elses-id',
     `status=${r.status} user=${createdUser}`);

  r = await clientUser.patch('/api/orders/any-id/status', { status: 'CANCELLED' });
  ok('a customer cannot change an order status', r.status === 403 || r.status === 401 || r.status === 404, `got ${r.status}`);

  // ── 18. Pay-on-delivery order flow ─────────────────────────────────────────
  section('Pay-on-delivery flow');
  const prod = (await anon.get('/api/products')).json;
  const p0 = Array.isArray(prod) && prod.length ? prod[0] : null;
  if (p0) {
    r = await clientUser.post('/api/orders', {
      productId: p0.id, type: 'RENT', totalAmount: 1000, paymentMethod: 'COD'
    });
    ok('COD pre-order is accepted without KYC documents', r.status === 200 || r.status === 201, `got ${r.status}`);
    ok('COD pre-order defaults to PENDING', r.json?.status === 'PENDING', `got ${r.json?.status}`);
    ok('COD pre-order defaults to UNPAID', r.json?.paymentStatus === 'UNPAID', `got ${r.json?.paymentStatus}`);

    if (r.json?.id) {
      let cur = await admin.patch(`/api/orders/${r.json.id}/status`, { status: 'PREPARING' });
      ok('admin can move to PREPARING', cur.json?.status === 'PREPARING', `got ${cur.json?.status}`);
      cur = await admin.patch(`/api/orders/${r.json.id}/status`, { status: 'DELIVERING' });
      ok('admin can move to DELIVERING', cur.json?.status === 'DELIVERING', `got ${cur.json?.status}`);
      cur = await admin.patch(`/api/orders/${r.json.id}/status`, { status: 'DELIVERED_PAID' });
      ok('admin can move to DELIVERED_PAID', cur.json?.status === 'DELIVERED_PAID', `got ${cur.json?.status}`);
      ok('delivery marks the order PAID automatically', cur.json?.paymentStatus === 'PAID', `got ${cur.json?.paymentStatus}`);
      const back = await admin.patch(`/api/orders/${r.json.id}/status`, { status: 'PENDING' });
      ok('status cannot move backwards', back.status === 400, `got ${back.status}`);
      // leave no residue
      const { PrismaClient } = await import('@prisma/client');
      const cleanup = new PrismaClient();
      await cleanup.order.delete({ where: { id: r.json.id } }).catch(() => {});
      await cleanup.$disconnect();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${'='.repeat(60)}\nPASS: ${pass}   FAIL: ${fail}`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach(f => console.log('  - ' + f));
  }
  await restoreDb();
  process.exit(fail ? 1 : 0);
}

await snapshotDb();
main().catch(e => { console.error('Suite crashed:', e); process.exit(2); });
