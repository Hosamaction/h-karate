/**
 * validator.js — App-side license validation (runs in main process)
 *
 * Security layers:
 *  1. Ed25519 signature verification  — forging requires your private key
 *  2. Expiry check                    — hard date encoded in signed payload
 *  3. Machine ID binding              — license tied to hardware fingerprint
 *  4. Online re-validation            — server can revoke any license instantly
 *  5. Grace period                    — 7 days offline allowed before hard lock
 *  6. Anti-tamper                     — license file stored encrypted at rest
 */

const { createVerify, createHash, createCipheriv, createDecipheriv, randomBytes } = require('crypto');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const https = require('https');

// ── Public key (baked in — safe to ship) ─────────────────────────────────────
// Replace this with the publicKey printed by: node license-server/keygen.js
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEApwudg1NqHYrBuDBuO8YEp0rIbH6i9KwHaf0ktVEh77w=
-----END PUBLIC KEY-----`;

// ── Server URL ────────────────────────────────────────────────────────────────
const LICENSE_SERVER = 'https://hkarate-license-server-production.up.railway.app';

// ── Encryption key for local license storage ──────────────────────────────────
// Derived from machine ID so the encrypted file is useless on another machine
function getStorageKey(machineId) {
  return createHash('sha256').update('hkarate-v06-' + machineId).digest();
}

function encryptLicense(obj, machineId) {
  const key = getStorageKey(machineId);
  const iv  = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const data = Buffer.from(JSON.stringify(obj), 'utf8');
  const enc  = Buffer.concat([cipher.update(data), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

function decryptLicense(str, machineId) {
  try {
    const [ivHex, encHex] = str.split(':');
    const key     = getStorageKey(machineId);
    const iv      = Buffer.from(ivHex, 'hex');
    const enc     = Buffer.from(encHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return JSON.parse(dec.toString('utf8'));
  } catch(_) { return null; }
}

// ── Machine fingerprint ───────────────────────────────────────────────────────
function getMachineId() {
  const parts = [
    os.hostname(),
    os.platform(),
    os.arch(),
    // CPU model
    (os.cpus()[0] || {}).model || '',
    // Total memory (rounded to nearest GB to tolerate RAM upgrades)
    String(Math.round(os.totalmem() / 1073741824)),
    // Network MAC addresses (stable interfaces only)
    Object.values(os.networkInterfaces())
      .flat()
      .filter(i => i && !i.internal && i.mac && i.mac !== '00:00:00:00:00:00')
      .map(i => i.mac)
      .sort()
      .join(',')
  ];
  return createHash('sha256').update(parts.join('|')).digest('hex');
}

// ── Signature verification ────────────────────────────────────────────────────
function verifySignature(payload, signature) {
  try {
    const verify = createVerify('SHA512');
    verify.update(payload);
    verify.end();
    return verify.verify(PUBLIC_KEY, signature, 'base64');
  } catch(_) { return false; }
}

function decodePayload(payloadB64) {
  try { return JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8')); }
  catch(_) { return null; }
}

// ── Online validation ─────────────────────────────────────────────────────────
function onlineValidate(licenseFile, machineId) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ licenseFile, machineId });
    const url  = new URL('/validate', LICENSE_SERVER);
    const opts = {
      hostname: url.hostname,
      port:     url.port || 443,
      path:     url.pathname,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout:  8000
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const r = JSON.parse(data);
          resolve({ ok: r.ok === true, reason: r.error || 'ok' });
        } catch(_) { resolve({ ok: false, reason: 'parse_error' }); }
      });
    });
    req.on('error', () => resolve({ ok: null, reason: 'offline' }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: null, reason: 'timeout' }); });
    req.write(body);
    req.end();
  });
}

// ── Main validator ────────────────────────────────────────────────────────────
/**
 * validateLicense(licenseFile, licensePath)
 *
 * licenseFile  — { payload: string, signature: string } — the raw license object
 * licensePath  — path to the encrypted local license storage file
 *
 * Returns: { valid: bool, reason: string, data: object|null, daysLeft: number }
 */
async function validateLicense(licenseFile, licensePath) {
  const machineId = getMachineId();

  // 1. Signature check
  if (!verifySignature(licenseFile.payload, licenseFile.signature)) {
    return { valid: false, reason: 'invalid_signature', data: null, daysLeft: 0 };
  }

  // 2. Decode payload
  const data = decodePayload(licenseFile.payload);
  if (!data) return { valid: false, reason: 'malformed', data: null, daysLeft: 0 };

  // 3. Expiry check
  const now      = Date.now();
  const daysLeft = Math.ceil((data.expiresAt - now) / 86400000);
  if (now > data.expiresAt) {
    return { valid: false, reason: 'expired', data, daysLeft: 0 };
  }

  // 4. Machine ID check (if bound)
  if (data.machineId && data.machineId !== machineId) {
    return { valid: false, reason: 'machine_mismatch', data, daysLeft };
  }

  // 5. Online check — with grace period
  const graceFile = licensePath + '.grace';
  const online = await onlineValidate(licenseFile, machineId);

  if (online.ok === true) {
    // Server confirmed valid — reset grace timer
    fs.writeFileSync(graceFile, String(Date.now()), 'utf8');
    return { valid: true, reason: 'ok', data, daysLeft };
  }

  if (online.ok === false) {
    // Server explicitly rejected (revoked, machine mismatch, etc.)
    return { valid: false, reason: online.reason, data, daysLeft };
  }

  // online.ok === null → offline / timeout — check grace period
  let lastOnline = 0;
  try { lastOnline = parseInt(fs.readFileSync(graceFile, 'utf8')); } catch(_) {}
  const graceDays = 7;
  const offlineDays = (now - lastOnline) / 86400000;
  if (offlineDays > graceDays) {
    return { valid: false, reason: 'grace_expired', data, daysLeft };
  }

  return { valid: true, reason: 'offline_grace', data, daysLeft };
}

/**
 * activateLicense(licenseFile, licensePath)
 * Called when user uploads a new license file.
 * Sends to server for machine binding, saves encrypted locally.
 */
async function activateLicense(licenseFile, licensePath) {
  const machineId = getMachineId();

  // Basic signature check first
  if (!verifySignature(licenseFile.payload, licenseFile.signature)) {
    return { ok: false, reason: 'invalid_signature' };
  }

  const data = decodePayload(licenseFile.payload);
  if (!data) return { ok: false, reason: 'malformed' };
  if (Date.now() > data.expiresAt) return { ok: false, reason: 'expired' };

  // Send to server for machine binding
  const body = JSON.stringify({ licenseFile, machineId });
  const url  = new URL('/activate', LICENSE_SERVER);

  const boundFile = await new Promise((resolve) => {
    const opts = {
      hostname: url.hostname,
      port:     url.port || 443,
      path:     url.pathname,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout:  10000
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch(_) { resolve({ ok: false, reason: 'parse_error' }); }
      });
    });
    req.on('error', () => resolve({ ok: false, reason: 'offline' }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, reason: 'timeout' }); });
    req.write(body);
    req.end();
  });

  if (!boundFile.ok) return { ok: false, reason: boundFile.error || 'server_error' };

  // Save encrypted license to disk
  const encrypted = encryptLicense(boundFile.licenseFile, machineId);
  fs.writeFileSync(licensePath, encrypted, 'utf8');
  // Set grace timer
  fs.writeFileSync(licensePath + '.grace', String(Date.now()), 'utf8');

  return { ok: true, expiresAt: boundFile.expiresAt, plan: boundFile.plan, daysLeft: Math.ceil((boundFile.expiresAt - Date.now()) / 86400000) };
}

/**
 * loadStoredLicense(licensePath) — load and decrypt the locally stored license
 */
function loadStoredLicense(licensePath) {
  try {
    const machineId = getMachineId();
    const raw = fs.readFileSync(licensePath, 'utf8');
    return decryptLicense(raw, machineId);
  } catch(_) { return null; }
}

module.exports = { validateLicense, activateLicense, loadStoredLicense, getMachineId };
