/**
 * AES-256-GCM encryption for KYC personal data (passport number, PINFL and the
 * KYC document/selfie references).
 *
 * ── Key handling contract (deliberate, please preserve) ────────────────────
 *  1. The key is read ONLY from process.env.KYC_ENCRYPTION_KEY.
 *  2. The key value is NEVER logged, printed, returned, or interpolated into
 *     any error message. `loadKey()` returns a Buffer used immediately by
 *     crypto calls; no error ever carries it.
 *  3. Error objects expose a stable `code` only. Messages are fixed strings.
 *  4. This module must not import or use console at all, so a stray log can
 *     never leak the key.
 *
 * Accepted key formats (in order):
 *   • 64 hex characters      → used directly as 32 bytes  (recommended)
 *   • base64 decoding to 32 bytes → used directly
 *   • anything ≥16 chars     → HKDF-SHA256 derived to 32 bytes
 * Anything shorter than 16 characters is refused rather than weakened silently.
 */

import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;   // 96-bit nonce, the GCM standard
const TAG_BYTES = 16;  // authentication tag
const PREFIX = 'enc:v1:';
const HKDF_INFO = 'voltmaxhub:kyc:v1';
const MIN_PASSPHRASE_LEN = 16;

/** Fixed, information-free error. `code` is safe to log; nothing else is. */
export class KycCryptoError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'KycCryptoError';
    this.code = code;
  }
}

/**
 * Derive the 32-byte key from the environment.
 * Returns null when unset or too weak — callers decide how to fail.
 */
function loadKey() {
  const raw = process.env.KYC_ENCRYPTION_KEY;
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (value.length === 0) return null;

  // Preferred: exactly 32 bytes supplied directly.
  if (/^[0-9a-fA-F]{64}$/.test(value)) return Buffer.from(value, 'hex');
  if (/^[A-Za-z0-9+/]{43}=?$/.test(value)) {
    const decoded = Buffer.from(value, 'base64');
    if (decoded.length === 32) return decoded;
  }

  // Fallback: derive a key from a passphrase.
  if (value.length < MIN_PASSPHRASE_LEN) return null;
  return Buffer.from(
    crypto.hkdfSync('sha256', Buffer.from(value, 'utf8'), Buffer.alloc(0), Buffer.from(HKDF_INFO), 32),
    'binary'
  );
}

/** True when the app has a usable key. Never reveals the key itself. */
export function isKeyConfigured() {
  return loadKey() !== null;
}

/** True when a stored value is already ciphertext (safe to skip re-encryption). */
export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/**
 * Encrypt a single value. Empty/nullish values pass through untouched so we
 * never turn a missing field into a ciphertext blob.
 * Throws KycCryptoError('KEY_NOT_CONFIGURED') when no usable key exists —
 * we fail closed rather than silently storing plaintext.
 */
export function encryptField(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;

  const key = loadKey();
  if (!key) {
    throw new KycCryptoError('KEY_NOT_CONFIGURED', 'KYC shifrlash kaliti sozlanmagan.');
  }

  try {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64');
  } catch {
    // Never surface the underlying crypto error: it could echo input details.
    throw new KycCryptoError('ENCRYPT_FAILED', 'KYC ma\'lumotini shifrlab bo\'lmadi.');
  }
}

/**
 * Decrypt a single value. Values that were never encrypted (legacy plaintext
 * rows) are returned as-is so the app keeps working before/while backfilling.
 * Throws KycCryptoError('DECRYPT_FAILED') on a wrong key or tampered data.
 */
export function decryptField(stored) {
  if (!isEncrypted(stored)) return stored;

  const key = loadKey();
  if (!key) {
    throw new KycCryptoError('KEY_NOT_CONFIGURED', 'KYC shifrlash kaliti sozlanmagan.');
  }

  let envelope;
  try {
    envelope = Buffer.from(stored.slice(PREFIX.length), 'base64');
  } catch {
    throw new KycCryptoError('CORRUPT', 'KYC ma\'lumot butunligi buzilgan.');
  }
  if (envelope.length <= IV_BYTES + TAG_BYTES) {
    throw new KycCryptoError('CORRUPT', 'KYC ma\'lumot butunligi buzilgan.');
  }

  const iv = envelope.subarray(0, IV_BYTES);
  const tag = envelope.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = envelope.subarray(IV_BYTES + TAG_BYTES);

  try {
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    // Wrong key or tampered ciphertext. Deliberately identical messages so an
    // attacker cannot distinguish the two cases.
    throw new KycCryptoError('DECRYPT_FAILED', 'KYC ma\'lumotini ochib bo\'lmadi.');
  }
}

/** Fields encrypted in the User model. */
export const USER_PII_FIELDS = ['passportSeries', 'pinfl', 'passportFront', 'passportBack', 'selfieUrl'];

/** Encrypt the PII fields of an object in place-safe fashion (returns a new object). */
export function encryptUserPII(data) {
  const out = { ...data };
  for (const field of USER_PII_FIELDS) {
    if (out[field] !== undefined) out[field] = encryptField(out[field]);
  }
  return out;
}

/** Encrypt the PII fields of a Verification payload. */
export function encryptVerificationPII(data) {
  const out = { ...data };
  for (const field of USER_PII_FIELDS) {
    if (out[field] !== undefined) out[field] = encryptField(out[field]);
  }
  return out;
}

/**
 * Decrypt the PII fields of a record for an authorised response.
 * A single unreadable field marks the whole record unreadable rather than
 * silently returning ciphertext to the client.
 */
export function decryptRecordPII(record) {
  if (!record || typeof record !== 'object') return record;
  const out = { ...record };
  for (const field of USER_PII_FIELDS) {
    if (out[field] !== undefined) out[field] = decryptField(out[field]);
  }
  return out;
}

/** Map version over a list of records. */
export function decryptRecordsPII(records) {
  if (!Array.isArray(records)) return records;
  return records.map(decryptRecordPII);
}

/** Strip PII so a caller can never accidentally ship ciphertext or plaintext. */
export function maskPII(record) {
  if (!record || typeof record !== 'object') return record;
  const out = { ...record };
  for (const field of USER_PII_FIELDS) {
    if (out[field]) out[field] = '***********';
  }
  return out;
}