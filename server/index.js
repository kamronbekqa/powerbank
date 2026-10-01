import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import {
  hashPassword, verifyPassword, isHashed, publicUser,
  requireAuth, requireAdmin, optionalAuth,
  csrfProtection, issueCsrfToken, rateLimit, securityHeaders,
  v, ValidationError, errorHandler
} from './lib/security.js';
import {
  KycCryptoError,
  encryptField, encryptUserPII, encryptVerificationPII,
  decryptField, decryptRecordPII, decryptRecordsPII, isKeyConfigured
} from './lib/kyc-crypto.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
// A known fallback secret would let anyone forge admin sessions, so production
// must supply its own. Development still gets an ephemeral random secret.
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') return '';
  return crypto.randomBytes(48).toString('hex');
})();
if (!JWT_SECRET) {
  console.error('');
  console.error('  [SECURITY] JWT_SECRET is not set and NODE_ENV=production.');
  console.error('  Refusing to start: a missing secret would allow anyone to forge');
  console.error('  admin sessions. Set JWT_SECRET in your environment.');
  console.error('');
  process.exit(1);
}
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '';
const IS_PROD = process.env.NODE_ENV === 'production';
const CROSS_SITE = Boolean(FRONTEND_ORIGIN);

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD || CROSS_SITE,
  sameSite: CROSS_SITE ? 'none' : 'lax',
  maxAge: TEN_DAYS_MS
};

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
let telegramPollingStarted = false;

// ── STARTUP SCHEMA CHECK ─────────────────────────────────────────────────────
// prisma/dev.db is intentionally not tracked in git (it holds personal data),
// so a fresh clone or a new server has no database file at all. Without this
// check the first query fails with a raw Prisma error such as
// "The table `main.Product` does not exist" instead of telling the operator
// what to do.
/**
 * Make the service self-healing: if the database is reachable but the schema is
 * missing (a fresh PostgreSQL instance, or a deploy whose start command skips
 * migrations), apply the committed migrations automatically and carry on.
 * This means the app works no matter how the host launches it.
 */
async function runMigrations() {
  const { spawn } = await import('node:child_process');
  return new Promise((resolve) => {
    const child = spawn('npx', ['prisma', 'migrate', 'deploy'], {
      stdio: 'inherit',
      env: process.env,
      shell: false
    });
    child.on('error', () => resolve(false));
    child.on('close', code => resolve(code === 0));
  });
}

async function assertSchemaReady() {
  if (process.env.SKIP_SCHEMA_CHECK === '1') return;
  const isPostgres = (process.env.DATABASE_URL || '').startsWith('postgres');

  const hasSchema = async () => {
    try { await prisma.$queryRawUnsafe('SELECT 1 FROM "Product" LIMIT 1'); return true; }
    catch { return false; }
  };

  if (await hasSchema()) return;

  // Distinguish "cannot reach the database" from "no schema yet".
  let reachable = false;
  try { await prisma.$queryRawUnsafe('SELECT 1'); reachable = true; } catch { reachable = false; }

  if (!reachable) {
    console.error('');
    console.error('  [DB] Cannot reach the database.');
    console.error('');
    if (isPostgres) {
      console.error('  PostgreSQL is configured but not answering:');
      console.error('    1. Is it running?   npm run db:local:status   (local)');
      console.error('    2. Wrong host/port/password in DATABASE_URL?');
      console.error('    3. Firewall / network?  test: psql "$DATABASE_URL" -c "SELECT 1"');
    } else {
      console.error('  SQLite is configured but the file is missing or unreadable.');
      console.error('    Check DATABASE_URL in .env (expected: file:./dev.db)');
    }
    console.error('');
    process.exit(1);
  }

  // Reachable but empty -> a fresh database. Apply migrations, then re-check.
  console.log('');
  console.log('  [DB] Database is reachable but has no schema yet.');
  console.log('  [DB] Applying migrations (prisma migrate deploy)...');
  const applied = await runMigrations();
  if (applied && await hasSchema()) {
    console.log('  [DB] Migrations applied successfully.');
    console.log('');
    return;
  }

  console.error('');
  console.error('  [DB] Could not apply migrations automatically.');
  console.error('');
  console.error('  Run this in the service shell / build step:');
  console.error('    npx prisma migrate deploy');
  console.error('');
  console.error('  Or set the service Start Command to:');
  console.error('    prisma migrate deploy && node server/index.js');
  console.error('');
  process.exit(1);
}

// ── TELEGRAM DYNAMIC CREDENTIALS & RETRY DISPATCH HELPER ─────────────────────
async function getTelegramConfig() {
  let botToken = '';
  let botChatId = '';
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (settings?.botToken && settings.botToken.trim()) {
      botToken = settings.botToken.trim();
    }
    if (settings?.botChatId && settings.botChatId.trim()) {
      botChatId = settings.botChatId.trim();
    }
  } catch (err) {}
  // Fallback to env if database not configured
  if (!botToken) botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!botChatId) botChatId = process.env.TELEGRAM_CHAT_ID || '';
  return { botToken, botChatId };
}

async function sendTelegramNotification({ text, documentBuffer, filename, caption }, attempts = 3) {
  const { botToken, botChatId } = await getTelegramConfig();
  if (!botToken || !botChatId) {
    console.warn('[VOLTMAXHUB Telegram Dispatch]: Telegram Bot Token yoki Admin Chat ID sozlanmagan.');
    return { success: false, error: 'Telegram Bot Token yoki Admin Chat ID sozlanmagan.' };
  }
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      if (documentBuffer) {
        const form = new FormData();
        form.append('chat_id', botChatId);
        if (caption) form.append('caption', caption.slice(0, 1024));
        form.append('document', new Blob([documentBuffer], { type: 'application/pdf' }), filename || 'document.pdf');
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, { method: 'POST', body: form });
        const json = await res.json();
        if (!json.ok) throw new Error(json.description || 'sendDocument API xatoligi');
        return { success: true, result: json.result };
      } else if (text) {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: botChatId, text: text.slice(0, 4000), parse_mode: 'Markdown' })
        });
        const json = await res.json();
        if (!json.ok) {
          // Retry without parse_mode if markdown parsing failed
          const fallbackRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: botChatId, text: text.slice(0, 4000) })
          });
          const fallbackJson = await fallbackRes.json();
          if (!fallbackJson.ok) throw new Error(fallbackJson.description || 'sendMessage API xatoligi');
          return { success: true, result: fallbackJson.result };
        }
        return { success: true, result: json.result };
      }
    } catch (err) {
      console.error(`[VOLTMAXHUB Telegram Retry ${attempt}/${attempts} Error]:`, err.message);
      if (attempt < attempts) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      } else {
        return { success: false, error: err.message };
      }
    }
  }
}

// ── CORS: explicit allow-list, never wildcard with credentials ──────────────
const ALLOWED_ORIGINS = FRONTEND_ORIGIN
  ? FRONTEND_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin(origin, cb) {
    // Same-origin / server-to-server requests have no Origin header.
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    // Refuse the origin instead of throwing: the request still reaches the route
    // but the browser gets no CORS headers, and no 500/error-log noise is produced.
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  maxAge: 600
}));

app.use(securityHeaders);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Issue a CSRF token cookie so the SPA can echo it in x-csrf-token.
app.use((req, res, next) => {
  if (!req.cookies?.csrf_token) issueCsrfToken(res);
  next();
});
app.use(csrfProtection);

// Broad, DoS-safe ceiling for the whole API.
app.use('/api', rateLimit({ windowMs: 60_000, max: 300 }));

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: 'voltmaxhub-backend', database: 'connected' });
  } catch (error) {
    res.status(503).json({ ok: false, service: 'voltmaxhub-backend', database: 'disconnected', error: error.message });
  }
});

function setAuthCookie(res, user) {
  const token = jwt.sign(
    { id: user.id, phone: user.phone, role: user.role },
    JWT_SECRET,
    { expiresIn: '10d' }
  );
  res.cookie('token', token, COOKIE_OPTIONS);
  return token;
}

// Rolling Session Middleware: renews 10-day expiration cookie on active user requests
app.use((req, res, next) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      const newToken = jwt.sign(
        { id: decoded.id, phone: decoded.phone, role: decoded.role },
        JWT_SECRET,
        { expiresIn: '10d' }
      );
      res.cookie('token', newToken, COOKIE_OPTIONS);
    } catch (err) {
      res.clearCookie('token'); // no maxAge on clearCookie (Express 5 compat)
    }
  }
  next();
});

// Automated Rental Tracker
async function checkOverdueRentals() {
  try {
    const now = new Date();
    const activeRentals = await prisma.order.findMany({
      where: {
        type: 'RENT',
        status: { in: ['ACTIVE', 'APPROVED', 'PENDING'] },
        endDate: { lt: now }
      }
    });

    for (const rental of activeRentals) {
      const daysOverdue = Math.floor((now - new Date(rental.endDate)) / (1000 * 60 * 60 * 24));
      let newStatus = 'OVERDUE';
      if (daysOverdue >= 3) {
        newStatus = 'LEGAL_PROCESS';
      }
      await prisma.order.update({
        where: { id: rental.id },
        data: { status: newStatus }
      });
    }
  } catch (err) {
    console.error('Error checking overdue rentals:', err);
  }
}

// Runs after assertSchemaReady() — see startServer().
// (was: checkOverdueRentals();)

// ── AUTHENTICATION API ──────────────────────────────────────────────────────
// Per-account + per-IP throttling. Fails are counted; successes are not.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessful: true,
  keyFn: req => {
    const id = String(req.body?.phone || req.body?.login || 'anon').toLowerCase().slice(0, 40);
    const fwd = req.headers['x-forwarded-for'];
    const ip = typeof fwd === 'string' ? fwd.split(',')[0].trim() : req.ip;
    return `${id}|${ip}`;
  },
  message: 'Login urinishlari limitdan oshdi. 15 daqiqa kutib turing.'
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { phone, login, password } = req.body;
    const userPhone = v.str(phone || login, 'Login', { min: 2, max: 60 });
    if (!userPhone) {
      return res.status(400).json({ error: 'Telefon raqami yoki loginni kiriting.' });
    }

    let user = await prisma.user.findUnique({ where: { phone: userPhone } });

    // Only bootstrap an admin when explicitly configured via env.
    if (!user && process.env.ADMIN_LOGIN && userPhone === process.env.ADMIN_LOGIN) {
      const initialPassword = v.str(process.env.ADMIN_PASSWORD, 'ADMIN_PASSWORD', { min: 8, max: 200 });
      user = await prisma.user.create({
        data: {
          phone: userPhone,
          password: await hashPassword(initialPassword),
          fullName: 'VOLTMAXHUB Administrator',
          role: 'ADMIN',
          isVerified: true
        }
      });
    }

    // Unknown account: do not reveal whether it exists.
    if (!user) {
      return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri.' });
    }

    const submitted = v.str(password, 'Parol', { min: 1, max: 200, required: false });
    const ok = await verifyPassword(submitted, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri.' });
    }

    // Lazy migration: upgrade legacy plaintext hashes after a successful login.
    if (!isHashed(user.password)) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { password: await hashPassword(submitted) }
      });
    }

    setAuthCookie(res, user);
    res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.post('/api/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }), async (req, res) => {
  try {
    const phone = v.phone(req.body?.phone, 'Telefon raqami');
    const fullName = v.str(req.body?.fullName, 'F.I.SH', { min: 3, max: 120 });
    const password = v.str(req.body?.password, 'Parol', { min: 6, max: 200 });

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return res.status(409).json({ error: 'Bu telefon raqami allaqachon ro\'yxatdan o\'tgan.' });
    }

    // Public registration can only ever create CLIENT accounts.
    // Admin accounts are provisioned by the server or the admin panel only.
    const user = await prisma.user.create({
      data: {
        phone,
        password: await hashPassword(password),
        fullName,
        role: 'CLIENT'
      }
    });

    setAuthCookie(res, user);
    res.status(201).json({ success: true, user: publicUser(user) });
  } catch (error) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

// Note: /api/auth/google is handled below after settings API

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.json({ success: false, user: null });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      res.clearCookie('token'); // no maxAge on clearCookie (Express 5 compat)
      return res.json({ success: false, user: null });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      res.clearCookie('token'); // no maxAge on clearCookie (Express 5 compat)
      return res.json({ success: false, user: null });
    }

    setAuthCookie(res, user);
    res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token'); // no maxAge on clearCookie (Express 5 compat)
  res.json({ success: true, message: 'Tizimdan muvaffaqiyatli chiqildi.' });
});

// Update User Profile (Avatar / Name) API
// Identity comes from the session cookie only — never from the request body (IDOR).
app.patch('/api/users/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const data = {};
    if (req.body?.avatar !== undefined) {
      const avatar = v.str(req.body.avatar, 'Avatar', { required: false, max: 3_000_000 });
      data.avatar = avatar || null;
    }
    if (req.body?.fullName !== undefined) {
      data.fullName = v.str(req.body.fullName, 'F.I.SH', { min: 2, max: 120 });
    }
    const updated = await prisma.user.update({ where: { id: userId }, data });
    res.json({ success: true, user: publicUser(updated) });
  } catch (error) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

// Auto Seed 4 Solar Panel Cards if missing
async function ensureSolarPanelsSeed() {
  try {
    const existingPanels = await prisma.product.findMany({ where: { category: 'SOLAR_PANEL' } });
    if (existingPanels.length === 0) {
      const defaultPanels = [
        {
          title: 'MECO 450W Mono PERC Panel',
          category: 'SOLAR_PANEL',
          capacity: '450W / 24V Monocrystalline',
          description: '21.8% yuqori samaradorlikka ega Monokristall quyosh paneli. Shamol va qor yuklamalariga chidamli, IP68 suv o\'tmas korpus va MC4 konnektorlar.',
          buyPrice: 1800000,
          oldBuyPrice: 2200000,
          rentPrice: 45000,
          oldRentPrice: 60000,
          stock: 15,
          images: JSON.stringify(['/assets/solar_450w.png']),
          usageSpecs: JSON.stringify([
            { name: 'Samaradorlik', icon: 'zap', runTime: '21.8%' },
            { name: 'Kafolat', icon: 'shield', runTime: '25 Yil' },
            { name: 'Himoya', icon: 'cloud', runTime: 'IP68 Water' },
            { name: 'Salmoq', icon: 'box', runTime: '21 kg' }
          ]),
          isAvailable: true
        },
        {
          title: 'MECO 550W Bifacial Glass-Glass',
          category: 'SOLAR_PANEL',
          capacity: '550W (+100W Rear Gain)',
          description: 'Ikki tomonlama quyosh nuri yutuvchi Double-Glass Bifacial panel. Orqa tomonidan qo\'shimcha 20% gacha quvvat ishlab chiqaradi.',
          buyPrice: 2400000,
          oldBuyPrice: 2900000,
          rentPrice: 65000,
          oldRentPrice: 85000,
          stock: 10,
          images: JSON.stringify(['/assets/solar_550w.png']),
          usageSpecs: JSON.stringify([
            { name: 'Samaradorlik', icon: 'zap', runTime: '22.5%' },
            { name: 'Kafolat', icon: 'shield', runTime: '30 Yil' },
            { name: 'Shisha', icon: 'box', runTime: 'Double Glass' },
            { name: 'Salmoq', icon: 'box', runTime: '27 kg' }
          ]),
          isAvailable: true
        },
        {
          title: 'MECO 200W Portable Foldable',
          category: 'SOLAR_PANEL',
          capacity: '200W / 18V Travel Panel',
          description: 'Kemping va sayohatlar uchun buklanadigan yengil portativ quyosh paneli. ETFE qoplamali, og\'irligi atigi 4.2kg.',
          buyPrice: 2100000,
          oldBuyPrice: 2500000,
          rentPrice: 50000,
          oldRentPrice: 70000,
          stock: 12,
          images: JSON.stringify(['/assets/solar_200w_foldable.png']),
          usageSpecs: JSON.stringify([
            { name: 'Portativlik', icon: 'box', runTime: '4.2 kg (Buklanadigan)' },
            { name: 'Qoplama', icon: 'shield', runTime: 'ETFE Premium' },
            { name: 'Chiquv', icon: 'zap', runTime: 'MC4 + DC5521' },
            { name: 'Kafolat', icon: 'shield', runTime: '2 Yil' }
          ]),
          isAvailable: true
        },
        {
          title: 'MECO 670W Ultra Industrial Panel',
          category: 'SOLAR_PANEL',
          capacity: '670W / 40V N-Type TopCon',
          description: "Tadbirkorlik ob'yektlari, fermer xo'jaliklari va sanoat bino tomlari uchun o'ta baquvvat N-Type TopCon panel.",
          buyPrice: 3200000,
          oldBuyPrice: 3800000,
          rentPrice: 85000,
          oldRentPrice: 110000,
          stock: 8,
          images: JSON.stringify(['/assets/solar_670w.png']),
          usageSpecs: JSON.stringify([
            { name: 'Texnologiya', icon: 'zap', runTime: 'N-Type TopCon' },
            { name: 'Samaradorlik', icon: 'zap', runTime: '23.1%' },
            { name: 'Kafolat', icon: 'shield', runTime: '30 Yil' },
            { name: 'Salmoq', icon: 'box', runTime: '33 kg' }
          ]),
          isAvailable: true
        }
      ];
      for (const p of defaultPanels) {
        await prisma.product.create({ data: p });
      }
      console.log('✅ Seeded 4 default Solar Panel cards successfully.');
    }
  } catch (err) {
    console.error('Solar Panel seed error:', err);
  }
}
// Runs after assertSchemaReady() — see startServer().
// (was: ensureSolarPanelsSeed();)

// ── 1. PRODUCTS API (FULL CRUD: GET, POST, PATCH, DELETE) ──────────────────
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        orders: true,
        reviews: true
      }
    });
    const formatted = products.map(p => ({
      ...p,
      category: p.category || 'GENERATOR',
      images: p.images ? JSON.parse(p.images) : [],
      usageSpecs: p.usageSpecs ? JSON.parse(p.usageSpecs) : [],
      totalOrders: p.orders ? p.orders.length : 0,
      totalRevenue: p.orders ? p.orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0) : 0
    }));
    res.json(formatted);
  } catch (error) {
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.post('/api/products', requireAdmin, async (req, res) => {
  try {
    const { title, category, capacity, description, buyPrice, rentPrice, oldBuyPrice, oldRentPrice, stock, images, usageSpecs, isAvailable } = req.body;
    const product = await prisma.product.create({
      data: {
        title,
        category: category || 'GENERATOR',
        capacity: capacity || '1kWh',
        description: description || '',
        buyPrice: buyPrice ? Number(buyPrice) : null,
        rentPrice: rentPrice ? Number(rentPrice) : null,
        oldBuyPrice: oldBuyPrice ? Number(oldBuyPrice) : null,
        oldRentPrice: oldRentPrice ? Number(oldRentPrice) : null,
        stock: stock ? Number(stock) : 1,
        images: JSON.stringify(images || []),
        usageSpecs: JSON.stringify(usageSpecs || []),
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true
      }
    });
    res.json(product);
  } catch (error) {
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.patch('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, capacity, description, buyPrice, rentPrice, oldBuyPrice, oldRentPrice, stock, images, usageSpecs, isAvailable } = req.body;

    const dataToUpdate = {};
    if (title !== undefined) dataToUpdate.title = title;
    if (category !== undefined) dataToUpdate.category = category;
    if (capacity !== undefined) dataToUpdate.capacity = capacity;
    if (description !== undefined) dataToUpdate.description = description;
    if (buyPrice !== undefined) dataToUpdate.buyPrice = buyPrice ? Number(buyPrice) : null;
    if (rentPrice !== undefined) dataToUpdate.rentPrice = rentPrice ? Number(rentPrice) : null;
    if (oldBuyPrice !== undefined) dataToUpdate.oldBuyPrice = oldBuyPrice ? Number(oldBuyPrice) : null;
    if (oldRentPrice !== undefined) dataToUpdate.oldRentPrice = oldRentPrice ? Number(oldRentPrice) : null;
    if (stock !== undefined) dataToUpdate.stock = Number(stock);
    if (images !== undefined) dataToUpdate.images = JSON.stringify(images);
    if (usageSpecs !== undefined) dataToUpdate.usageSpecs = JSON.stringify(usageSpecs);
    if (isAvailable !== undefined) dataToUpdate.isAvailable = Boolean(isAvailable);

    const product = await prisma.product.update({
      where: { id },
      data: dataToUpdate
    });
    res.json(product);
  } catch (error) {
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete associated orders/reviews first to maintain integrity
    await prisma.order.deleteMany({ where: { productId: id } });
    await prisma.review.deleteMany({ where: { productId: id } });

    await prisma.product.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Mahsulot muvaffaqiyatli o\'chirildi.' });
  } catch (error) {
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

// ── 2. ORDERS API ──────────────────────────────────────────────────────────
const ORDER_USER_FIELDS = {
        id: true, phone: true, fullName: true, role: true,
        avatar: true, isVerified: true
      };

app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    // Scope server-side: an admin sees every order, a customer only their own.
    // The client used to download all orders and filter locally, which handed
    // every customer everyone else's orders.
    const orders = await prisma.order.findMany({
      where: req.user.role === 'ADMIN' ? {} : { userId: req.user.id },
      include: { user: { select: ORDER_USER_FIELDS }, product: true },
      orderBy: { createdAt: 'desc' }
    });
    const formatted = orders.map(o => ({
      ...o,
      product: o.product ? {
        ...o.product,
        images: o.product.images ? JSON.parse(o.product.images) : [],
        usageSpecs: o.product.usageSpecs ? JSON.parse(o.product.usageSpecs) : []
      } : null
    }));
    res.json(formatted);
  } catch (error) {
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.post('/api/orders', optionalAuth, async (req, res) => {
  try {
    const {
      userId,
      phone,
      fullName,
      productId,
      type,
      startDate,
      endDate,
      totalAmount,
      passportSeries,
      pinfl,
      passportFront,
      passportBack,
      selfieUrl
    } = req.body;

    // Pay-on-delivery (COD) lets a customer place a pre-order before KYC: the
    // admin collects documents and cash when the unit is handed over.
    // Online prepayment keeps the original strict KYC requirement.
    const paymentMethod = req.body?.paymentMethod === 'ONLINE' ? 'ONLINE' : 'COD';
    const requiresKycNow = paymentMethod === 'ONLINE';

    if (type === 'RENT' && requiresKycNow && !/^\d{14}$/.test(String(pinfl || ''))) {
      return res.status(400).json({ error: 'Ijara uchun 14 xonali PINFL/JSHSHIR majburiy.' });
    }
    if (type === 'RENT' && requiresKycNow && (!String(passportSeries || '').trim() || !passportFront || !selfieUrl)) {
      return res.status(400).json({ error: 'Ijara uchun pasport seriyasi, pasport rasmi va pasport bilan selfi majburiy.' });
    }

    let user;
    // A signed-in customer always orders as themselves: never trust a userId
    // supplied in the request body (that would let anyone order as another user).
    if (req.user) {
      user = await prisma.user.findUnique({ where: { id: req.user.id } });
    } else if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }
    if (!user && phone) {
      user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        user = await prisma.user.create({
          data: encryptUserPII({
            phone,
            password: hashPassword(crypto.randomUUID()),
            fullName: fullName || 'Mijoz',
            passportSeries: passportSeries || null,
            pinfl: pinfl || null,
            passportFront: passportFront || null,
            passportBack: passportBack || null,
            selfieUrl: selfieUrl || null,
            isVerified: false
          })
        });
      }
    }

    if (!user) {
      return res.status(400).json({ error: 'Foydalanuvchi ma\'lumotlari ko\'rsatilmadi.' });
    }

    if (type === 'RENT' && (passportSeries || pinfl)) {
      await prisma.verification.create({
        data: encryptVerificationPII({
          userId: user.id,
          passportSeries: passportSeries || 'AA0000000',
          pinfl: pinfl || '00000000000000',
          passportFront: passportFront || null,
          passportBack: passportBack || null,
          selfieUrl: selfieUrl || null,
          status: 'PENDING'
        })
      });
      await prisma.user.update({
        where: { id: user.id },
        data: encryptUserPII({
          fullName: fullName || user.fullName,
          passportSeries: passportSeries || decryptField(user.passportSeries),
          pinfl: pinfl || decryptField(user.pinfl),
          passportFront: passportFront || decryptField(user.passportFront),
          selfieUrl: selfieUrl || decryptField(user.selfieUrl)
        })
      });
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        productId,
        type: type || 'BUY',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        totalAmount: Number(totalAmount),
        // A pre-order always starts in PENDING ("Kutilmoqda"); the admin moves it
        // through PREPARING -> DELIVERING -> DELIVERED_PAID as it is fulfilled.
        status: 'PENDING',
        paymentMethod,
        paymentStatus: paymentMethod === 'ONLINE' ? 'PAID' : 'UNPAID',
        note: req.body?.note ? String(req.body.note).slice(0, 500) : null
      },
      include: {
        product: true,
        user: { select: ORDER_USER_FIELDS }
      }
    });

    // Dispatch notification to Telegram Admin Chat
    sendTelegramNotification({
      text: `📦 *VOLTMAXHUB — YANGI BUYURTMA!*\n\n` +
        `👤 *Mijoz:* ${user.fullName || 'Mijoz'}\n` +
        `📞 *Tel:* ${user.phone}\n` +
        `⚡️ *Mahsulot:* ${order.product?.title || 'Generator'}\n` +
        `📋 *Turi:* ${type === 'RENT' ? 'Kunlik Ijara' : 'Xarid (Sotuv)'}\n` +
        `💰 *Summa:* ${Number(totalAmount).toLocaleString()} UZS\n` +
        `🚲 *To'lov:* ${paymentMethod === 'ONLINE' ? 'Onlayn (oldindan)' : 'Naqd (yetkazishda)'}\n` +
        `📅 *Sana:* ${new Date().toLocaleDateString('uz-UZ')}`
    }).catch(err => console.error('[Order Telegram Error]:', err));

    res.json(order);
  } catch (error) {
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

// Fulfilment chain for pay-on-delivery pre-orders. An admin may move an order
// forward (or cancel it); jumping backwards is rejected so the customer's
// timeline stays monotonic.
const ORDER_FLOW = ['PENDING', 'PREPARING', 'DELIVERING', 'DELIVERED_PAID'];
const TERMINAL_ORDER_STATES = ['COMPLETED', 'CANCELLED'];

app.patch('/api/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    const current = await prisma.order.findUnique({ where: { id }, select: { id: true, status: true, paymentStatus: true, type: true } });
    if (!current) return res.status(404).json({ error: 'Buyurtma topilmadi.' });

    if (ORDER_FLOW.includes(current.status) && ORDER_FLOW.includes(status)) {
      const from = ORDER_FLOW.indexOf(current.status);
      const to = ORDER_FLOW.indexOf(status);
      if (to < from) {
        return res.status(400).json({ error: 'Buyurtma holatini orqaga qaytarib bo\'lmaydi.' });
      }
    }

    // Cash is collected on handover, so delivering marks the order paid.
    const autoPaid = status === 'DELIVERED_PAID';
    const order = await prisma.order.update({
      where: { id },
      data: {
        status,
        ...(paymentStatus ? { paymentStatus } : autoPaid ? { paymentStatus: 'PAID' } : {})
      },
      include: { user: { select: ORDER_USER_FIELDS }, product: true }
    });
    res.json(order);
  } catch (error) {
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

// ── 3. REVIEWS & SHARHLAR API ──────────────────────────────────────────────
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (error) {
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { userName, location, rating, comment } = req.body;
    if (!userName || !comment) {
      return res.status(400).json({ error: 'Ismingiz va sharh matnini kiriting.' });
    }
    const review = await prisma.review.create({
      data: {
        userName,
        location: location || 'Toshkent',
        rating: Number(rating) || 5,
        comment
      }
    });
    res.json(review);
  } catch (error) {
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

// ── 4. BIZGA BOG'LANISH / CONTACT API ──────────────────────────────────────
app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(contacts);
  } catch (error) {
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    const { name, phone, subject, message } = req.body;
    if (!name || !phone || !message) {
      return res.status(400).json({ error: 'Ismingiz, telefon raqamingiz va xabar to\'ldirilishi shart.' });
    }
    const contact = await prisma.contactMessage.create({
      data: {
        name,
        phone,
        subject: subject || 'Umumiy savol',
        message
      }
    });

    // Dispatch notification to Telegram Admin Chat
    sendTelegramNotification({
      text: `📩 *VOLTMAXHUB — YANGI MUROJAAT!*\n\n` +
        `👤 *Ism:* ${name}\n` +
        `📞 *Tel:* ${phone}\n` +
        `📌 *Mavzu:* ${subject || 'Umumiy savol'}\n` +
        `💬 *Xabar:* ${message}`
    }).catch(err => console.error('[Contact Telegram Error]:', err));

    res.json({ success: true, contact });
  } catch (error) {
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.delete('/api/contacts/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.contactMessage.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

// ── 4.5. REGISTERED USERS, SITE SETTINGS & VISITOR TRACKER API ────────────
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: 'ADMIN' } },
      orderBy: { createdAt: 'desc' },
      // Explicit field list: `password` is never selected, so it cannot be leaked.
      // (Prisma forbids mixing `select` with `include`, so relations are nested.)
      select: {
        id: true, phone: true, fullName: true, role: true, avatar: true,
        address: true, isVerified: true, createdAt: true,
        passportSeries: true, pinfl: true,
        passportFront: true, passportBack: true, selfieUrl: true,
        orders: true,
        verifications: { select: { id: true, status: true, createdAt: true } }
      }
    });
    res.json(decryptRecordsPII(users));
  } catch (error) {
    if (error instanceof KycCryptoError) {
      console.error('[API ERROR] KYC decrypt failed:', error.code);
      return res.status(500).json({ error: 'KYC ma\'lumotlarini ochib bo\'lmadi.' });
    }
    console.error('[API ERROR] GET /api/users:', error.message);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

// ── SETTINGS API ────────────────────────────────────────────────────────────
// Bot token / MyID secret are never returned to any client, only booleans.
function safeSettings(settings) {
  const { botToken, myIdClientSecret, ...safe } = settings;
  // Reflect the *effective* config: an env token still makes Telegram work, so
  // the admin panel must not claim "not configured" when a fallback is active.
  const envToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const envSecret = (process.env.MYID_CLIENT_SECRET || '').trim();
  return {
    ...safe,
    botTokenConfigured: Boolean((botToken && botToken.trim()) || envToken),
    botTokenSource: botToken && botToken.trim() ? 'database' : (envToken ? 'env' : null),
    myIdClientSecretConfigured: Boolean((myIdClientSecret && myIdClientSecret.trim()) || envSecret)
  };
}

async function loadSettings() {
  let settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  if (!settings) settings = await prisma.siteSettings.create({ data: { id: 'default' } });
  return settings;
}

// Public-safe settings for anonymous visitors (contact info only).
// NOTE: visitCount is deliberately NOT exposed here — it is admin-only data and
// must not be readable by anonymous visitors (not even via devtools).
app.get('/api/settings/public', async (_req, res) => {
  try {
    const s = await loadSettings();
    res.json({
      companyName: s.companyName,
      phone: s.phone,
      email: s.email,
      telegram: s.telegram,
      instagram: s.instagram,
      address: s.address,
      deliverySlotLabel: s.deliverySlotLabel,
      deliveryStartHour: s.deliveryStartHour,
      deliveryEndHour: s.deliveryEndHour,
      maxRentalDays: s.maxRentalDays,
      minRentalDays: s.minRentalDays
    });
  } catch {
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

// Full settings — admin only (was previously readable by anyone, incl. secrets).
app.get('/api/settings', requireAdmin, async (_req, res) => {
  try {
    res.json(safeSettings(await loadSettings()));
  } catch {
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

async function validateBotToken(token) {
  if (!token || !token.trim()) return { valid: false, error: 'Token bo\'sh' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token.trim()}/getMe`);
    const data = await res.json();
    if (!data.ok) return { valid: false, error: data.description || 'Token noto\'g\'ri' };
    return { valid: true, botInfo: data.result };
  } catch (err) {
    return { valid: false, error: 'Telegram API ga ulanib bo\'lmadi.' };
  }
}

async function validateChatId(token, chatId) {
  if (!chatId || !chatId.trim()) return { valid: false, error: 'Chat ID bo\'sh' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token.trim()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: '✅ VOLTMAXHUB Bot sozlamalari tasdiqlandi. Test xabari.'
      })
    });
    const data = await res.json();
    if (!data.ok) return { valid: false, error: data.description || 'Chat ID noto\'g\'ri yoki bot admin emas' };
    return { valid: true };
  } catch {
    return { valid: false, error: 'Telegram API ga ulanib bo\'lmadi.' };
  }
}

// Verify a bot token + chat id without persisting anything.
app.post('/api/settings/validate-telegram', requireAdmin, async (req, res) => {
  try {
    const botToken = v.str(req.body?.botToken, 'Bot token', { min: 20, max: 200 });
    const botChatId = v.chatId(req.body?.botChatId, 'Chat ID');

    const tokenResult = await validateBotToken(botToken);
    if (!tokenResult.valid) return res.status(400).json({ error: `Bot token: ${tokenResult.error}` });

    const chatResult = await validateChatId(botToken, botChatId);
    if (!chatResult.valid) return res.status(400).json({ error: `Chat ID: ${chatResult.error}` });

    res.json({ success: true, botInfo: { username: tokenResult.botInfo?.username || null }, message: 'Bot token va Chat ID tasdiqlandi.' });
  } catch (error) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

// ── Per-block settings updates (each saves only its own fields) ─────────────
app.patch('/api/settings/footer', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const data = {
      companyName: v.str(b.companyName, 'Kompaniya nomi', { min: 2, max: 160 }),
      phone: v.phone(b.phone, 'Telefon', { required: false, minDigits: 7 }),
      email: v.email(b.email, 'Email', { required: false }),
      telegram: v.url(b.telegram, 'Telegram havolasi', { required: false }),
      instagram: v.url(b.instagram, 'Instagram havolasi', { required: false }),
      address: v.str(b.address, 'Manzil', { required: false, max: 300 })
    };
    await prisma.siteSettings.upsert({ where: { id: 'default' }, update: data, create: { id: 'default', ...data } });
    res.json({ success: true, message: 'Footer sozlamalari saqlandi.', settings: safeSettings(await loadSettings()) });
  } catch (error) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.patch('/api/settings/visitor', requireAdmin, async (req, res) => {
  try {
    const visitCount = v.int(req.body?.visitCount, 'Tashriflar soni', { min: 0, max: 10_000_000 });
    await prisma.siteSettings.upsert({
      where: { id: 'default' },
      update: { visitCount },
      create: { id: 'default', visitCount }
    });
    res.json({ success: true, message: 'Tashriflar soni saqlandi.', settings: safeSettings(await loadSettings()) });
  } catch (error) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.patch('/api/settings/delivery', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const data = {
      deliveryStartHour: v.int(b.deliveryStartHour, 'Boshlanish soati', { min: 0, max: 23 }),
      deliveryEndHour: v.int(b.deliveryEndHour, 'Tugash soati', { min: 0, max: 23 }),
      deliverySlotLabel: v.str(b.deliverySlotLabel, 'Yetkazib berish matni', { min: 2, max: 120 }),
      minRentalDays: v.int(b.minRentalDays, 'Minimal ijara muddati', { min: 1, max: 365 }),
      maxRentalDays: v.int(b.maxRentalDays, 'Maksimal ijara muddati', { min: 1, max: 365 })
    };
    if (data.deliveryEndHour <= data.deliveryStartHour) {
      throw new ValidationError('Tugash soati boshlanishdan katta bo\'lishi kerak.');
    }
    if (data.minRentalDays > data.maxRentalDays) {
      throw new ValidationError('Minimal muddat maksimal muddatdan katta bo\'lmasligi kerak.');
    }
    await prisma.siteSettings.upsert({ where: { id: 'default' }, update: data, create: { id: 'default', ...data } });
    res.json({ success: true, message: 'Yetkazib berish sozlamalari saqlandi.', settings: safeSettings(await loadSettings()) });
  } catch (error) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.patch('/api/settings/telegram', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const data = {
      botChatId: v.chatId(b.botChatId, 'Chat ID', { required: false }),
      penaltyRate: v.num(b.penaltyRate, 'Penya stavkasi', { min: 0, max: 100 }),
      legalNoticeDays: v.int(b.legalNoticeDays, 'Sudga berish muddati', { min: 1, max: 90 })
    };
    // Token is write-only: only update when a non-empty value is supplied.
    if (typeof b.botToken === 'string' && b.botToken.trim()) {
      const token = b.botToken.trim();
      if (token.length < 20 || token.length > 200) throw new ValidationError('Bot token formati noto\'g\'ri.');
      data.botToken = token;
    }
    await prisma.siteSettings.upsert({ where: { id: 'default' }, update: data, create: { id: 'default', ...data } });
    res.json({ success: true, message: 'Telegram sozlamalari saqlandi.', settings: safeSettings(await loadSettings()) });
  } catch (error) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

// Telegram status: metadata only, never the token.
app.get('/api/settings/telegram', requireAdmin, async (_req, res) => {
  try {
    const s = await loadSettings();
    const envToken = process.env.TELEGRAM_BOT_TOKEN || '';
    const envChat = process.env.TELEGRAM_CHAT_ID || '';
    res.json({
      chatId: s.botChatId || envChat || null,
      chatIdSource: s.botChatId ? 'database' : (envChat ? 'env' : null),
      tokenConfigured: Boolean((s.botToken && s.botToken.trim()) || envToken),
      tokenSource: s.botToken ? 'database' : (envToken ? 'env' : null)
    });
  } catch {
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.patch('/api/settings/myid', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const data = {
      myIdEnabled: v.bool(b.myIdEnabled),
      myIdClientId: v.str(b.myIdClientId, 'MyID Client ID', { required: false, max: 200 })
    };
    if (typeof b.myIdClientSecret === 'string' && b.myIdClientSecret.trim()) {
      data.myIdClientSecret = b.myIdClientSecret.trim();
    }
    await prisma.siteSettings.upsert({ where: { id: 'default' }, update: data, create: { id: 'default', ...data } });
    res.json({ success: true, message: 'MyID sozlamalari saqlandi.', settings: safeSettings(await loadSettings()) });
  } catch (error) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

// ── ADMIN CREDENTIALS CHANGE API ────────────────────────────────────────────
app.post('/api/settings/admin-credentials', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const newLogin = v.str(b.newLogin, 'Admin login', { required: false, min: 3, max: 60 });
    const newPassword = v.str(b.newPassword, 'Admin paroli', { required: false, min: 8, max: 200 });

    if (!newLogin && !newPassword) {
      throw new ValidationError('Yangi login yoki parol kiriting.');
    }

    // Update the currently authenticated admin, not "whichever admin is first".
    const adminUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!adminUser) return res.status(404).json({ error: 'Admin foydalanuvchi topilmadi.' });

    const data = {};
    if (newLogin && newLogin !== adminUser.phone) {
      const taken = await prisma.user.findUnique({ where: { phone: newLogin } });
      if (taken) throw new ValidationError('Bu login band qilingan.');
      data.phone = newLogin;
    }
    if (newPassword) data.password = await hashPassword(newPassword);

    const updated = await prisma.user.update({ where: { id: adminUser.id }, data });

    // Keep the current session valid after a credential change.
    setAuthCookie(res, updated);
    res.json({ success: true, message: 'Admin ma\'lumotlari yangilandi.', user: publicUser(updated) });
  } catch (error) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

// ── GOOGLE OAUTH AUTHENTICATION API ──────────────────────────────────────
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google token (credential) taqdim etilmadi.' });
    }

    // Real Google ID Token tekshiruvi
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      return res.status(401).json({ error: 'Google token yaroqsiz yoki muddati o\'tgan.' });
    }

    const userEmail = payload.email;
    const userName = payload.name || payload.email;
    const picture = payload.picture || '';

    if (!userEmail) {
      return res.status(400).json({ error: 'Google hisobdan email olinmadi.' });
    }

    // Foydalanuvchini topish yoki yaratish
    let user = await prisma.user.findFirst({
      where: { phone: userEmail }
    });

    if (!user) {
      // OAuth-only account: store an unguessable random secret, never a literal.
      user = await prisma.user.create({
        data: {
          phone: userEmail,
          fullName: v.str(userName, 'Ism', { required: false, max: 120 }) || userEmail,
          password: await hashPassword(crypto.randomBytes(32).toString('hex')),
          role: 'CLIENT',
          isVerified: true,
          avatar: v.url(picture, 'Avatar', { required: false }) || null
        }
      });
    }

    setAuthCookie(res, user);
    res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});


// Visitor counter. Anonymous, read/write by design: every page view calls this.
// Starts from a real 0 (no fabricated seed value) and increments atomically so
// concurrent page loads cannot lose an increment.
app.post('/api/stats/visit', async (req, res) => {
  try {
    await prisma.siteSettings.upsert({
      where: { id: 'default' },
      update: { visitCount: { increment: 1 } },
      create: { id: 'default', visitCount: 1 }
    });
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { visitCount: true }
    });
    res.json({ success: true, visitCount: settings.visitCount });
  } catch (error) {
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});


// ── 5. KYC VERIFICATION API ────────────────────────────────────────────────
app.get('/api/verifications', requireAdmin, async (req, res) => {
  try {
    const verifications = await prisma.verification.findMany({
      orderBy: { createdAt: 'desc' },
      // Explicit fields: never `include: { user: true }`, which would drag in
      // the user's password hash.
      select: {
        id: true, userId: true, passportSeries: true, pinfl: true,
        passportFront: true, passportBack: true, selfieUrl: true,
        status: true, rejectionReason: true, createdAt: true,
        user: { select: { id: true, phone: true, fullName: true, isVerified: true } }
      }
    });
    // Decrypt for the admin UI; ciphertext must never reach the client.
    res.json(decryptRecordsPII(verifications));
  } catch (error) {
    if (error instanceof KycCryptoError) {
      console.error('[API ERROR] KYC decrypt failed:', error.code);
      return res.status(500).json({ error: 'KYC ma\'lumotlarini ochib bo\'lmadi.' });
    }
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.post('/api/verifications', async (req, res) => {
  try {
    const { userId, phone, passportSeries, pinfl, passportFront, passportBack, selfieUrl } = req.body;
    if (!String(passportSeries || '').trim() || !/^\d{14}$/.test(String(pinfl || '')) || !passportFront || !selfieUrl) {
      return res.status(400).json({ error: 'KYC uchun pasport seriyasi, 14 xonali PINFL, pasport rasmi va pasport bilan selfi majburiy.' });
    }
    let targetUserId = userId;
    if (!targetUserId && phone) {
      let u = await prisma.user.findUnique({ where: { phone } });
      if (!u) {
        // Set an unusable random password: this account is created by a KYC
        // submission, not by a signup, so it must not fall back to a default.
        u = await prisma.user.create({
          data: encryptUserPII({
            phone, passportSeries, pinfl,
            password: hashPassword(crypto.randomBytes(32).toString('hex')),
            isVerified: false
          })
        });
      }
      targetUserId = u.id;
    }

    if (targetUserId) {
      await prisma.user.update({
        where: { id: targetUserId },
        data: encryptUserPII({
          ...(passportSeries ? { passportSeries } : {}),
          ...(pinfl ? { pinfl } : {}),
          isVerified: false
        })
      }).catch(e => console.error('User passport update error:', e));
    }

    const verification = await prisma.verification.create({
      data: encryptVerificationPII({
        userId: targetUserId,
        passportSeries: passportSeries || '',
        pinfl: pinfl || '',
        passportFront,
        passportBack,
        selfieUrl,
        status: 'PENDING'
      })
    });
    // Return the request values the client already knows, never ciphertext.
    res.json({ ...verification, ...decryptRecordPII(verification) });
  } catch (error) {
    if (error instanceof KycCryptoError) {
      console.error('[API ERROR] KYC encrypt failed:', error.code);
      return res.status(503).json({ error: 'KYC xizmati vaqtincha ishlamaydi.' });
    }
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.patch('/api/verifications/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const verification = await prisma.verification.update({
      where: { id },
      data: { status, rejectionReason }
    });

    if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: verification.userId },
        data: { isVerified: true }
      });
    } else if (status === 'REJECTED') {
      await prisma.user.update({
        where: { id: verification.userId },
        data: { isVerified: false }
      });
    }
    res.json(decryptRecordPII(verification));
  } catch (error) {
    if (error instanceof KycCryptoError) {
      console.error('[API ERROR] KYC decrypt failed:', error.code);
      return res.status(500).json({ error: 'KYC ma\'lumotlarini ochib bo\'lmadi.' });
    }
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.patch('/api/users/:id/kyc-status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isVerified: Boolean(isVerified) },
      select: { id: true, phone: true, fullName: true, role: true, avatar: true, isVerified: true }
    });

    const newStatus = isVerified ? 'APPROVED' : 'REJECTED';
    await prisma.verification.updateMany({
      where: { userId: id },
      data: { status: newStatus }
    });

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

// ── 6. PAYMENT CHECKOUT API (CLICK / PAYME) ────────────────────────────────
app.post('/api/checkout/click', async (req, res) => {
  const { orderId, amount } = req.body;
  const merchantId = process.env.CLICK_MERCHANT_ID || '12345';
  const serviceId = process.env.CLICK_SERVICE_ID || '67890';
  const frontendOrigin = FRONTEND_ORIGIN ? FRONTEND_ORIGIN.split(',')[0].trim() : 'https://voltmaxhub.uz';
  const returnUrl = encodeURIComponent(`${frontendOrigin}/payment/success`);
  
  const clickCheckoutUrl = `https://my.click.uz/services/pay?service_id=${serviceId}&merchant_id=${merchantId}&amount=${amount}&transaction_param=${orderId}&return_url=${returnUrl}`;

  res.json({ success: true, redirectUrl: clickCheckoutUrl, provider: 'CLICK' });
});

app.post('/api/checkout/payme', async (req, res) => {
  const { orderId, amount } = req.body;
  const merchantId = process.env.PAYME_MERCHANT_ID || '5f123456789';
  const amountTiyn = amount * 100;
  
  const payload = `m=${merchantId};ac.order_id=${orderId};a=${amountTiyn}`;
  const encodedPayload = Buffer.from(payload).toString('base64');
  const paymeCheckoutUrl = `https://checkout.paycom.uz/${encodedPayload}`;

  res.json({ success: true, redirectUrl: paymeCheckoutUrl, provider: 'PAYME' });
});

// ── 7. LEGAL AUTO-PDF ENGINE (DA'VO ARIZASI GENERATOR) ────────────────────
app.get('/api/legal/davo-arizasi/:orderId', requireAdmin, async (req, res) => {
  try {
    // The legal document contains sensitive customer identity data.
    const { orderId } = req.params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, product: true }
    });

    if (!order) {
      return res.status(404).send('Buyurtma topilmadi.');
    }

    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const companyName = settings?.companyName || 'VOLTMAXHUB';
    const companyAddress = settings?.address || 'Toshkent sh., Chilonzor t., 10-mavze 4-uy';
    const companyPhone = settings?.phone || '+998 71 200 50 50';

    const todayStr = new Date().toLocaleDateString('uz-UZ');
    const endDateStr = order.endDate ? new Date(order.endDate).toLocaleDateString('uz-UZ') : '—';
    const now = new Date();
    const daysOverdue = order.endDate ? Math.max(1, Math.floor((now - new Date(order.endDate)) / (1000 * 60 * 60 * 24))) : 5;
    
    const baseAmount = order.totalAmount || 1000000;
    const penaltyRate = 0.005;
    const penaltyAmount = Math.round(baseAmount * penaltyRate * daysOverdue);
    const totalClaimAmount = baseAmount + penaltyAmount;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="uz">
    <head>
      <meta charset="UTF-8">
      <title>Da'vo Arizasi — ${companyName} CRM Legal Engine</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 14pt; line-height: 1.5; margin: 40px; color: #000; }
        .header { text-align: right; margin-left: 50%; font-size: 12pt; margin-bottom: 30px; }
        .title { text-align: center; font-weight: bold; font-size: 16pt; margin: 20px 0; text-transform: uppercase; }
        .subtitle { text-align: center; font-size: 12pt; font-style: italic; margin-bottom: 20px; }
        .content { text-align: justify; text-indent: 30px; margin-bottom: 15px; }
        .claim-box { border: 2px solid #000; padding: 15px; margin: 20px 0; background: #f9f9f9; }
        .footer { margin-top: 50px; display: flex; justify-space-between; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; background: #0070f3; color: white; padding: 12px; border-radius: 6px; text-align: center;">
        <strong>${companyName} LEGAL AUTO-PDF ENGINE:</strong> Ushbu hujjat rasmiy sud arizasi (Da'vo arizasi) hisoblanadi. Chop etish uchun Ctrl+P / Cmd+P bosing.
      </div>

      <div class="header">
        <strong>Fuqarolik ishlari bo'yicha Toshkent shahar Sudiga</strong><br>
        <strong>Da'vogar:</strong> "${companyName}" MChJ<br>
        Manzil: ${companyAddress}<br>
        Tel: ${companyPhone}<br><br>
        <strong>Javobgar:</strong> ${order.user.fullName || 'Alisher Qayumov'}<br>
        Pasport: ${order.user.passportSeries || 'AA1234567'}, PINFL: ${order.user.pinfl || '31204958390124'}<br>
        Telefon: ${order.user.phone}<br>
        Manzil: ${order.user.address || 'Toshkent shahri'}
      </div>

      <div class="title">DA'VO ARIZASI</div>
      <div class="subtitle">(Mol-mulkni qaytarish va ijara qarzdorligini hamda penyani undirish to'g'risida)</div>

      <p class="content">
        Da'vogar "${companyName}" MChJ va Javobgar <strong>${order.user.fullName || 'Alisher Qayumov'}</strong> o'rtasida 
        elektron ommaviy oferta shartnomasi bilan <strong>${order.product.title}</strong> (sig'imi: ${order.product.capacity}) 
        uskunasini vaqtincha ijaraga berish bo'yicha shartnoma tuzilgan.
      </p>

      <p class="content">
        Shartnoma shartlariga ko'ra, Javobgar uskunani <strong>${endDateStr}</strong> sanasiga qadar qaytarishi hamda 
        ijara haqini to'liq to'lashi shart edi. Biroq, Javobgar shartnoma majburiyatlarini qo'pol ravishda buzib, 
        ijara muddati tugagan bo'lishiga qaramay (<strong>${daysOverdue} kun o'tgan</strong>), uskunani Da'vogarga qaytarmadi va ijara haqini to'lamadi.
      </p>

      <p class="content">
        O'zbekiston Respublikasi Fuqarolik Kodeksining 535-moddasiga muvofiq, ijara shartnomasi bo'yicha ijaraga beruvchi ijaraga oluvchiga mol-mulkni haq evaziga vaqtincha egalik qilish va foydalanish uchun topshirish majburiyatini oladi. FK 553-moddasiga ko'ra, ijara shartnomasi bekor qilinganda ijaraga oluvchi ijaraga beruvchiga mol-mulkni qanday holatda olgan bo'lsa, shunday holatda qaytarishi shart.
      </p>

      <div class="claim-box">
        <strong>UNDIRILADIGAN JAMI SUMMA HISOB-KITOBI:</strong><br>
        1. Asosiy ijara qarzi: <strong>${baseAmount.toLocaleString()} UZS</strong><br>
        2. Shartnomaviy penya (${daysOverdue} kun uchun 0.5%): <strong>${penaltyAmount.toLocaleString()} UZS</strong><br>
        <strong>JAMI UNDIRILISHI SO'RALAYOTGAN DA'VO SUMMASI: ${totalClaimAmount.toLocaleString()} UZS</strong>
      </div>

      <div class="title" style="font-size: 13pt; text-align: left;">YUQORIDAGILARDAN KELIB CHIQIB, SO'RAYMAN:</div>

      <ol style="margin-left: 20px; line-height: 1.8;">
        <li>Javobgar <strong>${order.user.fullName || 'Alisher Qayumov'}</strong>dan "${companyName}" MChJ foydasiga <strong>${order.product.title}</strong> uskunasi natursida (asl holatda) majburiy tartibda olib berilsin.</li>
        <li>Javobgardan Da'vogar foydasiga <strong>${totalClaimAmount.toLocaleString()} UZS</strong> miqdoridagi ijara qarzi va penya undirilsin.</li>
        <li>Sud xarajatlari va davlat boji Javobgar zimmasiga yuklatilsin.</li>
      </ol>

      <div style="margin-top: 40px;">
        <strong>Ilovalar:</strong><br>
        1. Ommaviy oferta shartnomasi nusxasi.<br>
        2. Mijoz KYC pasport va PINFL ma'lumotlari nusxasi.<br>
        3. Uskunani topshirish-qabul qilish dalolatnomasi va buyurtma cheki (#${order.id}).
      </div>

      <div style="margin-top: 50px; display: flex; justify-space-between;">
        <div>
          Sana: <strong>${todayStr}</strong>
        </div>
        <div>
          <strong>"VOLTMAXHUB" MChJ Direktori:</strong> _______________ (Imzo)
        </div>
      </div>
    </body>
    </html>
    `;

    res.send(htmlContent);
  } catch (error) {
    res.status(500).send('Xatolik yuz berdi: ' + error.message);
  }
});

// ── 8. TELEGRAM BOT DISPATCH ENGINE FOR LEGAL PETITION ────────────────────
app.post('/api/legal/send-telegram', requireAdmin, async (req, res) => {
  try {
    const { orderId, chatId } = req.body;
    const activeToken = process.env.TELEGRAM_BOT_TOKEN || '';
    const adminChatId = process.env.TELEGRAM_CHAT_ID || '';

    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const companyName = settings?.companyName || 'VOLTMAXHUB';

    let messageText = '';
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true, product: true }
      });
      if (order) {
        const todayStr = new Date().toLocaleDateString('uz-UZ');
        const endDateStr = order.endDate ? new Date(order.endDate).toLocaleDateString('uz-UZ') : '—';
        const now = new Date();
        const daysOverdue = order.endDate ? Math.floor((now - new Date(order.endDate)) / (1000 * 60 * 60 * 24)) : 0;
        if (order.type !== 'RENT' || daysOverdue <= 3 || ['COMPLETED', 'CANCELLED'].includes(order.status)) {
          return res.status(400).json({ error: 'PDF faqat 3 kundan ko‘p kechikkan va qaytarilmagan ijara uchun yuboriladi.' });
        }
        const baseAmount = order.totalAmount || 1000000;
        const penaltyAmount = Math.round(baseAmount * 0.005 * daysOverdue);
        const totalClaimAmount = baseAmount + penaltyAmount;

        messageText = `⚖️ *RASMIY DA'VO ARIZASI (SUD ARIZASI)*\n` +
          `----------------------------------------\n` +
          `🏛 *Sud:* Fuqarolik ishlari bo'yicha Toshkent shahar sudi\n` +
          `🏢 *Da'vogar:* "${companyName}" MChJ\n` +
          `👤 *Javobgar:* ${order.user?.fullName || 'Mijoz'}\n` +
          `📞 *Tel:* ${order.user?.phone || '—'}\n` +
          `🪪 *Pasport:* ${order.user?.passportSeries || '—'}, PINFL: ${order.user?.pinfl || '—'}\n\n` +
          `📦 *Uskuna:* ${order.product?.title || '${companyName} Generator'} (${order.product?.capacity || ''})\n` +
          `📅 *Shartnoma muddati tugagan sana:* ${endDateStr} (${daysOverdue} kun o'tgan)\n\n` +
          `💰 *UNDIRILADIGAN SUMMA:* \n` +
          `• Asosiy qarz: ${baseAmount.toLocaleString()} UZS\n` +
          `• Penya (0.5%/kun): ${penaltyAmount.toLocaleString()} UZS\n` +
          `• *JAMI DA'VO SUMMASI: ${totalClaimAmount.toLocaleString()} UZS*\n\n` +
          `📌 FK 535, 553-moddalariga asosan sud tartibida undirish so'raladi.\n` +
          `📄 Rasmiy da'vo arizasi PDF fayl sifatida ilova qilindi.`;
      }
    }

    if (!messageText) return res.status(404).json({ error: 'Ijara buyurtmasi topilmadi.' });

    if (!activeToken) return res.status(503).json({ error: 'Serverda TELEGRAM_BOT_TOKEN sozlanmagan.' });
    if (!adminChatId) return res.status(503).json({ error: 'Server .env faylida admin TELEGRAM_CHAT_ID sozlanmagan.' });
    if (String(chatId || '') !== String(adminChatId)) return res.status(403).json({ error: 'Mijoz hujjatlari faqat sozlangan admin Telegram chatiga yuboriladi.' });
    if (!orderId) return res.status(400).json({ error: 'Ijara buyurtmasi ID ko‘rsatilmagan.' });

    // Render from the active Prisma order. The legacy Django PDF endpoint uses
    // a separate PostgreSQL database and cannot see these SQLite orders.
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true, product: true } });
    if (!order) return res.status(404).json({ error: 'Ijara buyurtmasi topilmadi.' });
    const { spawn } = await import('node:child_process');
    const python = process.env.PYTHON_BIN || 'backend/venv/bin/python';
    const script = 'import sys; from weasyprint import HTML; sys.stdout.buffer.write(HTML(string=sys.stdin.buffer.read().decode("utf-8")).write_pdf())';
    const renderer = spawn(python, ['-c', script], { stdio: ['pipe', 'pipe', 'pipe'] });
    const pdf = await new Promise((resolve, reject) => {
      const chunks = [];
      let renderError = '';
      renderer.stdout.on('data', chunk => chunks.push(chunk));
      renderer.stderr.on('data', chunk => { renderError += chunk.toString(); });
      renderer.on('error', reject);
      renderer.on('close', code => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`PDF yaratilmadi: ${renderError.slice(-500)}`)));
      const safe = value => String(value || '—').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
      const companyNameSafe = safe(companyName);
      const companyAddressSafe = safe(settings?.address || 'Toshkent sh., Chilonzor t., 10-mavze 4-uy');
      const companyPhoneSafe = safe(settings?.phone || '+998 71 200 50 50');
      renderer.stdin.end(`<html><head><meta charset="utf-8"><style>body{font-family:serif;font-size:14pt;line-height:1.5;margin:36px}.title{text-align:center;font-weight:bold;font-size:18pt;margin:24px}li{margin:12px 0}</style></head><body><h2 style="text-align:right">${companyNameSafe} MChJ<br>Da’vogar</h2><div class="title">DA’VO ARIZASI</div><p>Fuqarolik ishlari bo‘yicha sudga</p><p>Javobgar: <b>${safe(order.user?.fullName)}</b><br>Telefon: ${safe(order.user?.phone)}<br>Manzil: ${safe(order.user?.address)}</p><p>Buyurtma: #${safe(order.id)}<br>Mahsulot: ${safe(order.product?.title)}<br>Ijara muddati: ${order.endDate ? new Date(order.endDate).toLocaleDateString('uz-UZ') : '—'}</p><p>Ijara muddati tugaganidan so‘ng mahsulot qaytarilmaganligi sababli, uni qaytarish va shartnoma bo‘yicha hisob-kitobni amalga oshirish so‘raladi.</p><p>Ilovalar: ijara shartnomasi va buyurtma ma’lumotlari.</p><p style="margin-top:60px">Sana: ${new Date().toLocaleDateString('uz-UZ')} <span style="float:right">Imzo: ______________</span></p></body></html>`);
    });
    const form = new FormData();
    form.append('chat_id', String(chatId || ''));
    form.append('caption', messageText.slice(0, 1024));
    form.append('document', new Blob([pdf], { type: 'application/pdf' }), `Mijoz_${orderId}_davo.pdf`);
    const response = await fetch(`https://api.telegram.org/bot${activeToken}/sendDocument`, { method: 'POST', body: form });
    const result = await response.json();
    if (!result.ok) throw new Error(result.description || 'Telegram API xatoligi');
    res.json({ success: true, result, previewText: messageText, message: 'PDF va mijoz ma’lumotlari admin Telegram chatiga yuborildi.' });
  } catch (error) {
    console.error('[API ERROR]', error.message); res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.get('/api/telegram/status', async (_req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const publicApi = process.env.PUBLIC_API_URL || '';
  const status = { tokenConfigured: Boolean(token), publicApiConfigured: Boolean(publicApi), webhookConfigured: false, pollingMode: true, lastWebhookError: null, error: null };
  if (token) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const result = await response.json();
      if (!result.ok) throw new Error(result.description || 'Telegram API xatoligi');
      status.webhookConfigured = Boolean(result.result?.url);
      status.lastWebhookError = result.result?.last_error_message || null;
    } catch (error) { status.error = error.message; }
  }
  res.json(status);
});

app.post('/api/telegram/setup-webhook', requireAdmin, async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const publicApi = process.env.PUBLIC_API_URL || '';
  if (!token) return res.status(503).json({ error: 'TELEGRAM_BOT_TOKEN server .env faylida sozlanmagan.' });
  if (!/^https:\/\//i.test(publicApi)) return res.status(503).json({ error: 'PUBLIC_API_URL ommaviy HTTPS server manziliga sozlanmagan.' });
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `${publicApi.replace(/\/$/, '')}/api/telegram/webhook` })
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.description || 'Telegram webhook sozlanmadi.');
    res.json({ success: true, message: 'Telegram webhook sozlandi.' });
  } catch (error) { console.error('[API ERROR] telegram webhook:', error.message); res.status(502).json({ error: 'Telegram sozlanmadi.' }); }
});

// Telegram webhook: /start replies to its sender; private customer data goes
// only to the explicitly configured administrator chat.
app.post('/api/telegram/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const message = req.body?.message;
    const chatId = message?.chat?.id;
    if (!chatId || !/^\/start(?:@\w+)?(?:\s|$)/.test(message?.text || '')) return;

    const api = (method) => token ? `https://api.telegram.org/bot${token}/${method}` : '';
    if (!token) {
      console.error('Telegram /start received but TELEGRAM_BOT_TOKEN is missing from server environment.');
      return;
    }
    const sendMessage = async (targetChatId, text) => {
      const response = await fetch(api('sendMessage'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: targetChatId, text: text.slice(0, 4000) }) });
      const result = await response.json();
      if (!result.ok) throw new Error(result.description || 'Telegram sendMessage xatoligi');
      return result;
    };

    const customers = await prisma.user.findMany({ where: { role: 'CLIENT' }, orderBy: { createdAt: 'desc' } });
    const rentals = await prisma.order.findMany({
      where: { type: 'RENT', endDate: { lt: new Date(Date.now() - 3 * 86400000) }, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      include: { user: true, product: true }, orderBy: { endDate: 'asc' }
    });
    await sendMessage(chatId, `🤖 VOLTMAXHUB bot ishga ulandi. Jami mijoz: ${customers.length}. 3 kundan oshgan ijara: ${rentals.length} ta.`);
    const adminChatId = process.env.TELEGRAM_CHAT_ID || '';
    if (adminChatId && String(chatId) === String(adminChatId)) {
      const lines = customers.slice(0, 35).map((customer, index) => `${index + 1}. ${customer.fullName || 'Mijoz'} — ${customer.phone}`);
      await sendMessage(adminChatId, `📊 VOLTMAXHUB mijozlar hisoboti\nJami mijoz: ${customers.length}\n3 kundan oshgan ijara: ${rentals.length}\n\n${lines.join('\n') || 'Hozircha mijoz yo‘q.'}`);
      for (const order of rentals) await sendMessage(adminChatId, `⚠️ ${order.user?.fullName || 'Mijoz'} (${order.user?.phone || 'telefon yo‘q'}) — ${order.product?.title || 'Ijara'}, muddati ${Math.floor((Date.now() - new Date(order.endDate)) / 86400000)} kun o‘tgan. Buyurtma: ${order.id}.`);
    }
  } catch (error) {
    console.error('Telegram /start report failed:', error.message);
  }
});

async function startTelegramPolling() {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!token || telegramPollingStarted) return;
  telegramPollingStarted = true;
  const baseUrl = `https://api.telegram.org/bot${token}`;
  let offset = 0;
  console.log('Telegram polling mode started (domain/webhook not required).');
  while (telegramPollingStarted) {
    try {
      const response = await fetch(`${baseUrl}/getUpdates?timeout=25&offset=${offset}`, { signal: AbortSignal.timeout(30000) });
      const result = await response.json();
      if (!result.ok) throw new Error(result.description || 'Telegram getUpdates xatoligi');
      for (const update of result.result || []) {
        offset = Math.max(offset, update.update_id + 1);
        const message = update.message;
        const chatId = message?.chat?.id;
        if (!chatId || !/^\/(?:start|id)(?:@\w+)?(?:\s|$)/.test(message.text || '')) continue;
        const sendMessage = async (text) => {
          const sent = await fetch(`${baseUrl}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000) })
          });
          const sendResult = await sent.json();
          if (!sendResult.ok) throw new Error(sendResult.description || 'Telegram sendMessage xatoligi');
        };
        if (String(message.text).startsWith('/id')) {
          await sendMessage(`Admin chat ID: ${chatId}\nBu raqamni serverdagi TELEGRAM_CHAT_ID sozlamasiga kiriting.`);
          continue;
        }
        const adminChatId = process.env.TELEGRAM_CHAT_ID || '';
        if (!adminChatId || String(chatId) !== String(adminChatId)) {
          await sendMessage(`VOLTMAXHUB bot ishlayapti ✅\nSizning Telegram chat ID: ${chatId}\nAdmin hisoboti va 3 kundan oshgan ijara ma’lumotlari uchun shu ID ni TELEGRAM_CHAT_ID ga sozlang.`);
          continue;
        }
        const customers = await prisma.user.findMany({ where: { role: 'CLIENT' }, orderBy: { createdAt: 'desc' } });
        const overdue = await prisma.order.findMany({
          where: { type: 'RENT', endDate: { lt: new Date(Date.now() - 3 * 86400000) }, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          include: { user: true, product: true }, orderBy: { endDate: 'asc' }
        });
        const customerLines = customers.slice(0, 35).map((customer, index) => `${index + 1}. ${customer.fullName || 'Mijoz'} — ${customer.phone}`);
        await sendMessage(`📊 VOLTMAXHUB mijozlar hisoboti\nJami mijoz: ${customers.length}\n3 kundan oshgan ijara: ${overdue.length}\n\n${customerLines.join('\n') || 'Hozircha mijoz yo‘q.'}`);
        for (const order of overdue) {
          await sendMessage(`⚠️ ${order.user?.fullName || 'Mijoz'} (${order.user?.phone || 'telefon yo‘q'}) — ${order.product?.title || 'Ijara'}, muddati ${Math.floor((Date.now() - new Date(order.endDate)) / 86400000)} kun o‘tgan. Buyurtma: ${order.id}.`);
        }
      }
    } catch (error) {
      console.error('Telegram polling error:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}


// ── Global error handler: no stack traces, SQL, paths or secrets to clients ──
app.use(errorHandler);

// ── CART API (server-side; guests use localStorage on the client) ─────────────
const CART_PRODUCT_SELECT = {
  id: true, title: true, capacity: true, category: true,
  buyPrice: true, rentPrice: true, stock: true, isAvailable: true,
  images: true, description: true
};

function withImages(product) {
  if (!product) return product;
  let images = [];
  try { images = JSON.parse(product.images || '[]'); } catch { images = []; }
  return { ...product, images };
}

app.get('/api/cart', requireAuth, async (req, res) => {
  try {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: { product: { select: CART_PRODUCT_SELECT } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(items.map(i => ({ ...i, product: withImages(i.product) })));
  } catch (error) {
    console.error('[API ERROR] GET /api/cart:', error.message);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.post('/api/cart', requireAuth, async (req, res) => {
  try {
    const { productId, quantity = 1, type = 'RENT' } = req.body || {};
    if (!productId) return res.status(400).json({ error: 'Mahsulot tanlanmagan.' });
    if (!['BUY', 'RENT'].includes(type)) return res.status(400).json({ error: 'Noto\'g\'ri savdo turi.' });
    const qty = Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 99);

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, stock: true } });
    if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi.' });
    if (product.stock < 1) return res.status(400).json({ error: 'Mahsulot omborda yo\'q.' });

    // One row per (user, product, type): repeated adds bump the quantity.
    const item = await prisma.cartItem.upsert({
      where: { userId_productId_type: { userId: req.user.id, productId, type } },
      update: { quantity: { increment: qty } },
      create: { userId: req.user.id, productId, type, quantity: qty },
      include: { product: { select: CART_PRODUCT_SELECT } }
    });
    res.status(201).json({ ...item, product: withImages(item.product) });
  } catch (error) {
    console.error('[API ERROR] POST /api/cart:', error.message);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.patch('/api/cart/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const qty = Math.min(Math.max(parseInt(req.body?.quantity, 10) || 0, 0), 99);
    const owned = await prisma.cartItem.findFirst({ where: { id, userId: req.user.id }, select: { id: true } });
    if (!owned) return res.status(404).json({ error: 'Savatda bunday mahsulot yo\'q.' });
    if (qty === 0) {
      await prisma.cartItem.delete({ where: { id } });
      return res.json({ success: true, removed: true });
    }
    const item = await prisma.cartItem.update({
      where: { id }, data: { quantity: qty },
      include: { product: { select: CART_PRODUCT_SELECT } }
    });
    res.json({ ...item, product: withImages(item.product) });
  } catch (error) {
    console.error('[API ERROR] PATCH /api/cart:', error.message);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.delete('/api/cart/:id', requireAuth, async (req, res) => {
  try {
    await prisma.cartItem.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('[API ERROR] DELETE /api/cart:', error.message);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.delete('/api/cart', requireAuth, async (req, res) => {
  try {
    await prisma.cartItem.deleteMany({ where: { userId: req.user.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('[API ERROR] DELETE /api/cart:', error.message);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

// ── WISHLIST API (signed-in users only) ───────────────────────────────────────
app.get('/api/wishlist', requireAuth, async (req, res) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user.id },
      include: { product: { select: CART_PRODUCT_SELECT } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(items.map(i => ({ ...i, product: withImages(i.product) })));
  } catch (error) {
    console.error('[API ERROR] GET /api/wishlist:', error.message);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.post('/api/wishlist', requireAuth, async (req, res) => {
  try {
    const { productId } = req.body || {};
    if (!productId) return res.status(400).json({ error: 'Mahsulot tanlanmagan.' });
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi.' });
    const item = await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: req.user.id, productId } },
      update: {},
      create: { userId: req.user.id, productId },
      include: { product: { select: CART_PRODUCT_SELECT } }
    });
    res.status(201).json({ ...item, product: withImages(item.product) });
  } catch (error) {
    console.error('[API ERROR] POST /api/wishlist:', error.message);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

app.delete('/api/wishlist/:productId', requireAuth, async (req, res) => {
  try {
    await prisma.wishlistItem.deleteMany({ where: { userId: req.user.id, productId: req.params.productId } });
    res.json({ success: true });
  } catch (error) {
    console.error('[API ERROR] DELETE /api/wishlist:', error.message);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

// Refuse to serve traffic against an unusable database.
assertSchemaReady().then(() => startServer()).catch(err => {
  console.error('[FATAL] Startup failed:', err.message);
  process.exit(1);
});

async function startServer() {
  // Background jobs that touch the database start only once the schema exists.
  try {
    await checkOverdueRentals();
    await ensureSolarPanelsSeed();
  } catch (error) {
    console.error('[WARN] startup job failed:', error.message);
  }
  app.listen(PORT, () => {
    console.log(`VOLTMAXHUB Backend API Server running on http://localhost:${PORT}`);
    startTelegramPolling();
  });
}
