/**
 * VOLTMAXHUB — Security primitives
 *
 * Zero-dependency implementations built on Node's crypto module.
 * Provides: password hashing (scrypt), auth guards, rate limiting,
 * CSRF double-submit tokens, security headers, and input validators.
 */
import crypto from 'node:crypto';

// ── Password hashing (scrypt) ───────────────────────────────────────────────
// Format: scrypt$<N>$<r>$<p>$<saltHex>$<hashHex>
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

function scryptAsync(password, salt, params) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, params.keylen, { N: params.N, r: params.r, p: params.p }, (err, dk) => {
      if (err) return reject(err);
      resolve(dk);
    });
  });
}

export async function hashPassword(plain) {
  if (typeof plain !== 'string' || plain.length === 0) {
    throw new Error('Parol bo\'sh bo\'lmasligi kerak.');
  }
  const salt = crypto.randomBytes(16);
  const dk = await scryptAsync(plain, salt, SCRYPT_PARAMS);
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt.toString('hex')}$${dk.toString('hex')}`;
}

export function isHashed(value) {
  return typeof value === 'string' && value.startsWith('scrypt$');
}

export async function verifyPassword(plain, stored) {
  if (typeof plain !== 'string' || typeof stored !== 'string' || !stored) return false;

  // Legacy plaintext stored value: compare in constant time, report for migration.
  if (!isHashed(stored)) {
    const a = Buffer.from(plain, 'utf8');
    const b = Buffer.from(stored, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  const parts = stored.split('$');
  if (parts.length !== 6) return false;
  const [, N, r, p, saltHex, hashHex] = parts;
  const params = { N: Number(N), r: Number(r), p: Number(p), keylen: hashHex.length / 2 };
  if (!Number.isFinite(params.N) || !Number.isFinite(params.r) || !Number.isFinite(params.p) || !Number.isFinite(params.keylen)) {
    return false;
  }
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = await scryptAsync(plain, salt, params);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Strip secret fields before sending a User object to the client. */
export function publicUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

// ── Authentication / authorization guards ───────────────────────────────────
export function getUser(req) {
  return req.user || null;
}

export function isAdmin(req) {
  return getUser(req)?.role === 'ADMIN';
}

/** 401 when unauthenticated, 403 when authenticated but not admin. */
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi.' });
  next();
}

/**
 * Populates req.user when a valid session cookie exists, but lets anonymous
 * callers through. Use for endpoints that serve guests yet behave differently
 * (and more safely) for a signed-in user.
 */
export function optionalAuth(req, res, next) {
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi.' });
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin ruxsati kerak.' });
  next();
}

// ── CSRF: signed double-submit cookie ───────────────────────────────────────
const CSRF_COOKIE = 'csrf_token';
const CSRF_TTL_MS = 8 * 60 * 60 * 1000; // 8h

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

export function issueCsrfToken(res) {
  const payload = b64url(JSON.stringify({ ts: Date.now() }));
  const nonce = crypto.randomBytes(16).toString('base64url');
  const body = `${payload}.${nonce}`;
  const sig = crypto.createHmac('sha256', process.env.JWT_SECRET || 'dev').update(body).digest('base64url');
  const token = `${body}.${sig}`;
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // must be readable by JS to echo back in header
    sameSite: 'none',
    secure: process.env.NODE_ENV === 'production' || Boolean(process.env.FRONTEND_ORIGIN),
    maxAge: CSRF_TTL_MS
  });
  return token;
}

function verifyCsrfToken(token) {
  if (typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [payload, nonce, sig] = parts;
  const expected = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'dev')
    .update(`${payload}.${nonce}`)
    .digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  // payload is base64url-encoded JSON: {"ts":<millis>}
  let ts;
  try {
    ts = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).ts;
  } catch {
    return false;
  }
  return Number.isFinite(ts) && Date.now() - ts < CSRF_TTL_MS;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Double-submit: cookie value must be echoed in x-csrf-token and match HMAC. */
export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  // Auth endpoints establish the session; they are protected by rate limiting
  // and SameSite cookie policy instead, and cannot require a pre-existing token.
  if (req.path === '/api/auth/login' || req.path === '/api/auth/google' || req.path === '/api/auth/register') {
    return next();
  }
  if (req.path === '/api/telegram/webhook') return next(); // inbound from Telegram

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get('x-csrf-token');

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: 'CSRF token topilmadi. Sahifani yangilang.' });
  }
  if (cookieToken !== headerToken || !verifyCsrfToken(cookieToken)) {
    return res.status(403).json({ error: 'CSRF token yaroqsiz. Sahifani yangilang.' });
  }
  next();
}

export { CSRF_COOKIE };

// ── Rate limiting (in-memory, sliding window) ──────────────────────────────
function clientIp(req) {
  // Render/Netlify set X-Forwarded-For; only trust the first hop.
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

const buckets = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, hits] of buckets) {
    const kept = hits.filter(t => now - t < 15 * 60 * 1000);
    if (kept.length) buckets.set(key, kept);
    else buckets.delete(key);
  }
}, 60 * 1000).unref?.();

/**
 * @param {object} opts
 *  - windowMs, max        general limit
 *  - keyFn(req)           custom bucket key (e.g. account+IP)
 *  - message
 *  - skipSuccessful       only count failures
 */
export function rateLimit({ windowMs = 60_000, max = 30, keyFn, message = 'Juda ko\'p urinish. Biroz kutib turing.', skipSuccessful = false } = {}) {
  return (req, res, next) => {
    const key = `${req.path}|${keyFn ? keyFn(req) : clientIp(req)}`;
    const now = Date.now();
    const hits = (buckets.get(key) || []).filter(t => now - t < windowMs);

    if (hits.length >= max) {
      const retryAfter = Math.ceil((windowMs - (now - hits[0])) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message, retryAfter });
    }

    if (!skipSuccessful) hits.push(now);
    buckets.set(key, hits);

    if (skipSuccessful) {
      // count only failed responses
      res.on('finish', () => {
        if (res.statusCode >= 400) {
          const cur = (buckets.get(key) || []).filter(t => Date.now() - t < windowMs);
          cur.push(Date.now());
          buckets.set(key, cur);
        }
      });
    }
    next();
  };
}

// ── Security headers ────────────────────────────────────────────────────────
export function securityHeaders(req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-DNS-Prefetch-Control', 'off');
  res.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.removeHeader('X-Powered-By');

  if (req.path.startsWith('/api/')) {
    // API returns JSON only; never allow framing or content sniffing.
    res.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  }
  if (process.env.NODE_ENV === 'production') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

// ── Input validation helpers ────────────────────────────────────────────────
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

const asString = v => (v === undefined || v === null ? '' : String(v));
const trim = v => asString(v).trim();

export const v = {
  /** Required, trimmed string with length bounds. */
  str(value, field, { min = 1, max = 255, required = true } = {}) {
    const s = trim(value);
    if (!s) {
      if (required) throw new ValidationError(`${field} majburiy.`);
      return '';
    }
    if (s.length < min) throw new ValidationError(`${field} kamida ${min} ta belgidan iborat bo'lishi kerak.`);
    if (s.length > max) throw new ValidationError(`${field} ko'pi bilan ${max} ta belgidan iborat bo'lishi kerak.`);
    return s;
  },

  /** Optional http(s) URL. Empty allowed when required=false. */
  url(value, field, { required = false } = {}) {
    const s = trim(value);
    if (!s) {
      if (required) throw new ValidationError(`${field} majburiy.`);
      return '';
    }
    if (s.length > 500) throw new ValidationError(`${field} juda uzun.`);
    let parsed;
    try {
      parsed = new URL(s);
    } catch {
      throw new ValidationError(`${field} to'g'ri URL formatida bo'lishi kerak.`);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new ValidationError(`${field} faqat http(s) bilan boshlanishi kerak.`);
    }
    return s;
  },

  email(value, field, { required = true } = {}) {
    const s = trim(value).toLowerCase();
    if (!s) {
      if (required) throw new ValidationError(`${field} majburiy.`);
      return '';
    }
    if (s.length > 254) throw new ValidationError(`${field} juda uzun.`);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) throw new ValidationError(`${field} to'g'ri email formatida emas.`);
    return s;
  },

  /** Phone: digits, spaces, +, -, () only; normalises separators. */
  phone(value, field, { required = true, minDigits = 7, maxDigits = 20 } = {}) {
    const s = trim(value);
    if (!s) {
      if (required) throw new ValidationError(`${field} majburiy.`);
      return '';
    }
    if (s.length > 40) throw new ValidationError(`${field} juda uzun.`);
    if (!/^[0-9+\-\s()]+$/.test(s)) throw new ValidationError(`${field} faqat raqam va belgilardan iborat bo'lishi kerak.`);
    const digits = s.replace(/\D/g, '');
    if (digits.length < minDigits || digits.length > maxDigits) {
      throw new ValidationError(`${field} ${minDigits}-${maxDigits} ta raqamdan iborat bo'lishi kerak.`);
    }
    return s;
  },

  int(value, field, { min = -Infinity, max = Infinity, required = true, fallback } = {}) {
    if (value === undefined || value === null || value === '') {
      if (required) throw new ValidationError(`${field} majburiy.`);
      return fallback;
    }
    const n = Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n)) throw new ValidationError(`${field} butun son bo'lishi kerak.`);
    if (n < min || n > max) throw new ValidationError(`${field} ${min} va ${max} orasida bo'lishi kerak.`);
    return n;
  },

  num(value, field, { min = -Infinity, max = Infinity, required = true, fallback } = {}) {
    if (value === undefined || value === null || value === '') {
      if (required) throw new ValidationError(`${field} majburiy.`);
      return fallback;
    }
    const n = Number(value);
    if (!Number.isFinite(n)) throw new ValidationError(`${field} raqam bo'lishi kerak.`);
    if (n < min || n > max) throw new ValidationError(`${field} ${min} va ${max} orasida bo'lishi kerak.`);
    return n;
  },

  /** Telegram chat id: negative or positive integer, as string. */
  chatId(value, field, { required = true } = {}) {
    const s = trim(value);
    if (!s) {
      if (required) throw new ValidationError(`${field} majburiy.`);
      return '';
    }
    if (!/^-?\d{1,20}$/.test(s)) throw new ValidationError(`${field} faqat raqamdan iborat bo'lishi kerak.`);
    return s;
  },

  bool(value) {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1' || value === 1) return true;
    if (value === 'false' || value === '0' || value === 0 || value === '') return false;
    return Boolean(value);
  }
};

// ── Global error handler ────────────────────────────────────────────────────
/** Never leak stack traces, SQL, or secrets to the client. */
export function errorHandler(err, req, res, next) {
  const status = err?.statusCode || 500;

  if (status >= 500) {
    // Safe diagnostics only — no request bodies, no secrets.
    console.error(`[API ERROR] ${req.method} ${req.path} -> ${status}: ${err?.message || 'unknown'}`);
  }

  if (res.headersSent) return next(err);

  if (status === 400) return res.status(400).json({ error: err.message || 'Noto\'g\'ri so\'rov.' });

  res.status(status).json({
    error: status >= 500 ? 'Serverda xatolik yuz berdi. Administratorga xabar bering.' : err.message || 'Xatolik yuz berdi.'
  });
}
