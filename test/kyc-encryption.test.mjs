/**
 * KYC AES-256-GCM encryption tests.
 * Run: node test/kyc-encryption.test.mjs
 *
 * Focus areas:
 *  • round-trip correctness
 *  • ciphertext never contains the plaintext
 *  • tamper / wrong-key detection
 *  • fail-closed when no key is configured
 *  • THE KEY NEVER APPEARS in output, errors or stack traces
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// A known test key. This is a throwaway value for tests only — never a real key.
const TEST_KEY = 'a'.repeat(64);
const CANARY = 'KYCKEYCANARY9f3a2b7c1d4e5f6a8b0c2d4e6f8a1b3c5d7e9f0a';
process.env.KYC_ENCRYPTION_KEY = TEST_KEY;

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name} ${extra}`); }
}
const section = t => console.log(`\n\u2500\u2500 ${t} ${'\u2500'.repeat(Math.max(0, 56 - t.length))}`);

// Capture everything written to stdout/stderr during a block.
function capture(fn) {
  const chunks = [];
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  process.stdout.write = (c, ...a) => { chunks.push(String(c)); return true; };
  process.stderr.write = (c, ...a) => { chunks.push(String(c)); return true; };
  try { return { value: fn(), output: chunks.join('') }; }
  catch (e) { return { error: e, output: chunks.join('') }; }
  finally { process.stdout.write = origOut; process.stderr.write = origErr; }
}

const kyc = await import(path.join(ROOT, 'server/lib/kyc-crypto.js'));
const { KycCryptoError, encryptField, decryptField, isEncrypted, isKeyConfigured,
        encryptUserPII, decryptRecordPII, decryptRecordsPII, maskPII } = kyc;

console.log('KYC AES-256-GCM encryption suite');
console.log('='.repeat(60));

// ── 1. Basic round-trip ───────────────────────────────────────────────────────
section('Round-trip');
const SAMPLES = [
  'AB1234567',
  '12345678901234',
  '/uploads/passport-front-abc.jpg',
  'Ünïcodé pässport — тест',
  'a'.repeat(500),
  '123'
];
for (const sample of SAMPLES) {
  const ct = encryptField(sample);
  ok(`round-trip: ${sample.slice(0, 24)}${sample.length > 24 ? '…' : ''}`,
     isEncrypted(ct) && decryptField(ct) === sample);
}

const ct = encryptField('AB1234567');
ok('ciphertext is prefixed/versioned', ct.startsWith('enc:v1:'));
ok('ciphertext hides the plaintext', !ct.includes('AB1234567'));
ok('two encryptions of same value differ (random IV)',
   encryptField('AB1234567') !== encryptField('AB1234567'));

section('Empty / null handling');
ok('null passes through', encryptField(null) === null);
ok('undefined passes through', encryptField(undefined) === undefined);
ok('empty string passes through', encryptField('') === '');

// ── 2. Legacy plaintext ───────────────────────────────────────────────────────
section('Legacy plaintext compatibility');
ok('legacy plaintext is returned as-is', decryptField('AA1234567') === 'AA1234567');
ok('legacy plaintext is not marked encrypted', !isEncrypted('AA1234567'));
ok('encrypt is idempotent-safe (already encrypted stays detectable)', isEncrypted(encryptField('X')));

// ── 3. Integrity ──────────────────────────────────────────────────────────────
section('Tamper detection');
const good = encryptField('SECRET-PASSPORT');
const tampered = good.slice(0, -6) + 'AAAAAA';
let tamperErr;
try { decryptField(tampered); } catch (e) { tamperErr = e; }
ok('tampered ciphertext is rejected', !!tamperErr);
ok('tamper error has a safe code', tamperErr?.code === 'DECRYPT_FAILED');

const truncated = 'enc:v1:' + Buffer.from('tooshort').toString('base64');
let truncErr;
try { decryptField(truncated); } catch (e) { truncErr = e; }
ok('truncated envelope is rejected', !!truncErr && truncErr.code === 'CORRUPT');

section('Wrong key detection');
const otherKey = 'b'.repeat(64);
const savedKey = process.env.KYC_ENCRYPTION_KEY;
process.env.KYC_ENCRYPTION_KEY = otherKey;
let wrongErr;
try { decryptField(good); } catch (e) { wrongErr = e; }
ok('wrong key is rejected', !!wrongErr);
ok('wrong-key and tamper are indistinguishable (same message)',
   wrongErr?.code === tamperErr?.code && wrongErr?.message === tamperErr?.message);
process.env.KYC_ENCRYPTION_KEY = savedKey;

// ── 4. Fail closed ────────────────────────────────────────────────────────────
section('Fail-closed without a key');
const realKey = process.env.KYC_ENCRYPTION_KEY;
delete process.env.KYC_ENCRYPTION_KEY;
ok('isKeyConfigured() is false without env', isKeyConfigured() === false);
let noKeyErr;
try { encryptField('AB1234567'); } catch (e) { noKeyErr = e; }
ok('encrypt refuses without a key (no silent plaintext)', !!noKeyErr);
ok('refusal code is KEY_NOT_CONFIGURED', noKeyErr?.code === 'KEY_NOT_CONFIGURED');
ok('legacy plaintext still readable without a key', decryptField('AA1234567') === 'AA1234567');

process.env.KYC_ENCRYPTION_KEY = 'tooshort';
ok('weak key (<16 chars) is refused', isKeyConfigured() === false);
process.env.KYC_ENCRYPTION_KEY = realKey;

// ── 5. THE KEY MUST NEVER LEAK ────────────────────────────────────────────────
section('KEY LEAKAGE (critical)');
process.env.KYC_ENCRYPTION_KEY = CANARY;
ok('isKeyConfigured() true with canary key', isKeyConfigured() === true);

const leakBlock = capture(() => {
  const out = [];
  const attempt = fn => {
    try { out.push(String(fn())); }
    catch (e) { out.push(String(e?.message), String(e?.code), String(e?.stack)); }
  };
  attempt(() => encryptField('AB1234567'));
  attempt(() => encryptField({ toString() { throw new Error('boom ' + process.env.KYC_ENCRYPTION_KEY); } }));
  attempt(() => decryptField('enc:v1:' + Buffer.from('short').toString('base64')));
  attempt(() => decryptField('enc:v1:@@@@not-base64@@@@'));
  attempt(() => decryptField(encryptField('X').slice(0, -4) + 'ZZZZ'));
  attempt(() => String(isKeyConfigured()));
  attempt(() => String(isEncrypted('x')));
  attempt(() => String(maskPII({ passportSeries: 'AB1234567' })));
  return out.join(' | ');
});

const combined = leakBlock.output + leakBlock.value;
ok('canary key absent from all output/errors/stacks', !combined.includes(CANARY));
ok('canary key absent even from a throwing toString()', !combined.includes(CANARY));

// The source file must not reference console at all (except the doc comment).
const src = fs.readFileSync(path.join(ROOT, 'server/lib/kyc-crypto.js'), 'utf8');
const codeLines = src.split('\n').filter(l => !/^\s*(\*|\/\/)/.test(l));
ok('module source contains no console call', !codeLines.some(l => /console\./.test(l)));

// Error messages must be fixed strings, never interpolate the key.
const msgSamples = [];
for (const fn of [() => decryptField('enc:v1:' + Buffer.from('ab').toString('base64')),
                  () => { delete process.env.KYC_ENCRYPTION_KEY; return encryptField('x'); }]) {
  try { fn(); } catch (e) { msgSamples.push(`${e.message}|${e.code}`); }
}
process.env.KYC_ENCRYPTION_KEY = CANARY;
ok('no error message embeds the key', !msgSamples.join(' ').includes(CANARY));
ok('error codes are from a fixed vocabulary',
   msgSamples.every(m => /CORRUPT|DECRYPT_FAILED|ENCRYPT_FAILED|KEY_NOT_CONFIGURED/.test(m)));

// ── 6. Object helpers ─────────────────────────────────────────────────────────
section('Object helpers');
const userRecord = {
  id: 'u1', phone: '+998901234567', fullName: 'Test',
  passportSeries: 'AB1234567', pinfl: '12345678901234',
  passportFront: '/u/f.jpg', passportBack: '/u/b.jpg', selfieUrl: '/u/s.jpg',
  isVerified: false
};
const encUser = encryptUserPII(userRecord);
ok('encryptUserPII leaves non-PII fields alone', encUser.phone === userRecord.phone && encUser.fullName === 'Test');
ok('encryptUserPII encrypts all 5 PII fields',
   ['passportSeries','pinfl','passportFront','passportBack','selfieUrl'].every(f => isEncrypted(encUser[f])));
const decUser = decryptRecordPII(encUser);
ok('decryptRecordPII restores everything',
   ['passportSeries','pinfl','passportFront','passportBack','selfieUrl']
     .every(f => decUser[f] === userRecord[f]));
ok('encryptUserPII does not mutate the input', userRecord.passportSeries === 'AB1234567');
ok('decryptRecordsPII maps a list', decryptRecordsPII([encUser]).length === 1);
ok('maskPII hides values', maskPII(encUser).passportSeries === '***********');

// ── 7. Key formats ────────────────────────────────────────────────────────────
section('Accepted key formats');
for (const [label, key] of [
  ['64 hex chars', 'c'.repeat(64)],
  ['hex with digits', '0123456789abcdef'.repeat(4)],
  ['base64 of 32 bytes', Buffer.alloc(32, 7).toString('base64')],
  ['passphrase >=16 chars', 'correct-horse-battery-staple']
]) {
  process.env.KYC_ENCRYPTION_KEY = key;
  let worked = false;
  try { worked = decryptField(encryptField('X')) === 'X'; } catch { worked = false; }
  ok(`key format accepted: ${label}`, worked);
}
process.env.KYC_ENCRYPTION_KEY = TEST_KEY;

// A different key must not be able to read data from another key.
const hexKey = 'd'.repeat(64);
process.env.KYC_ENCRYPTION_KEY = TEST_KEY;
const fromHex = encryptField('CROSS-KEY');
process.env.KYC_ENCRYPTION_KEY = hexKey;
let crossErr;
try { decryptField(fromHex); } catch (e) { crossErr = e; }
ok('data from one key is unreadable with another key', !!crossErr);
process.env.KYC_ENCRYPTION_KEY = TEST_KEY;

console.log(`\n${'='.repeat(60)}\nPASS: ${pass}   FAIL: ${fail}`);
if (failures.length) { console.log('\nFailures:'); failures.forEach(f => console.log('  - ' + f)); }
process.exit(fail ? 1 : 0);