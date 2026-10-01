/**
 * Fix broken product image paths in a deployed environment using the app's own
 * admin API (no direct database access needed).
 *
 * Usage: BASE=https://site.example node scripts/fix-product-images.mjs
 */
const BASE = process.env.BASE || 'https://powerbank-eq86.onrender.com';
const LOGIN = process.env.ADMIN_LOGIN || '+998909990011';
const PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const REPLACE = {
  'solar_450w.png': 'solar_450w.svg',
  'solar_550w.png': 'solar_550w.svg',
  'solar_200w_foldable.png': 'solar_200w_foldable.svg',
  'solar_670w.png': 'solar_670w.svg'
};

// Minimal cookie jar so the session + CSRF cookies survive between calls.
const jar = new Map();
const store = res => {
  const raw = res.headers.getSetCookie?.() || [];
  for (const c of raw) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    const k = pair.slice(0, i).trim();
    const v = pair.slice(i + 1).trim();
    if (v === '') jar.delete(k); else jar.set(k, v);
  }
};
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');

async function call(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.csrf === false ? {} : { 'X-CSRF-Token': jar.get('csrf_token') || '' }),
      Cookie: cookieHeader(),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  store(res);
  return res;
}

const login = await call('/api/auth/login', {
  method: 'POST', csrf: false,
  body: { login: LOGIN, phone: LOGIN, password: PASSWORD }
});
if (!login.ok) {
  console.error(`Admin login failed: HTTP ${login.status}`);
  process.exit(1);
}
console.log(`Logged in to ${BASE}`);

const products = await (await call('/api/products')).json();
let fixed = 0;

for (const product of products) {
  const images = Array.isArray(product.images) ? product.images : [];
  if (!images.some(u => REPLACE[String(u).split('/').pop()])) continue;

  const next = images.map(u => {
    const file = String(u).split('/').pop();
    return REPLACE[file] ? `/assets/${REPLACE[file]}` : u;
  });

  const res = await call(`/api/products/${product.id}`, {
    method: 'PATCH',
    body: { images: next }
  });
  if (res.ok) {
    console.log(`  fixed: ${product.title}`);
    fixed++;
  } else {
    console.log(`  FAILED (${res.status}): ${product.title}`);
  }
}

console.log(`\n${fixed} product(s) updated.`);