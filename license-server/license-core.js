/**
 * license-core.js — Shared license logic (server side)
 * Signs and verifies license payloads using Ed25519.
 *
 * License file format (JSON):
 * {
 *   payload: base64(JSON({ email, plan, issuedAt, expiresAt, machineId, licenseId })),
 *   signature: base64(Ed25519Sign(payload))
 * }
 */
const crypto = require('crypto');
const fs   = require('fs');
const path = require('path');

let _keys = null;
function keys() {
  if (!_keys) {
    // Use environment variables if available, otherwise fall back to keys.json file
    if (process.env.PRIVATE_KEY && process.env.PUBLIC_KEY) {
      _keys = {
        privateKey: process.env.PRIVATE_KEY,
        publicKey: process.env.PUBLIC_KEY
      };
    } else {
      _keys = JSON.parse(fs.readFileSync(path.join(__dirname, 'keys.json'), 'utf8'));
    }
  }
  return _keys;
}

/**
 * Issue a signed license.
 * @param {object} opts
 * @param {string} opts.email
 * @param {string} opts.plan        — 'monthly' | 'yearly' | 'lifetime'
 * @param {string} opts.machineId   — SHA-256 hardware fingerprint from the app (optional at issue time, bound on first activation)
 * @param {number} opts.daysValid   — how many days until expiry
 * @param {string} opts.licenseId   — unique ID (UUID)
 */
function issueLicense({ email, plan, machineId = '', daysValid, licenseId }) {
  const now       = Date.now();
  const expiresAt = now + daysValid * 86400000;
  const payloadObj = { email, plan, issuedAt: now, expiresAt, machineId, licenseId, v: 1 };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64');

  // Use crypto.sign() directly for Ed25519 keys
  const privateKeyObject = crypto.createPrivateKey({
    key: keys().privateKey,
    format: 'pem',
    type: 'pkcs8'
  });
  
  const signature = crypto.sign(null, Buffer.from(payloadB64), privateKeyObject).toString('base64');

  return { payload: payloadB64, signature };
}

/**
 * Verify a license object. Returns { valid, reason, data }.
 */
function verifyLicense({ payload, signature }) {
  try {
    // Use crypto.verify() directly for Ed25519 keys
    const publicKeyObject = crypto.createPublicKey({
      key: keys().publicKey,
      format: 'pem',
      type: 'spki'
    });
    
    const ok = crypto.verify(null, Buffer.from(payload), publicKeyObject, Buffer.from(signature, 'base64'));
    if (!ok) return { valid: false, reason: 'invalid_signature' };

    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    if (Date.now() > data.expiresAt) return { valid: false, reason: 'expired', data };
    return { valid: true, reason: 'ok', data };
  } catch (e) {
    return { valid: false, reason: 'malformed' };
  }
}

/**
 * Re-issue a license with a new machineId bound (called on first activation).
 */
function bindMachine({ payload, signature }, machineId) {
  const check = verifyLicense({ payload, signature });
  if (!check.valid) return null;
  const data = check.data;
  data.machineId = machineId;
  // remaining days
  const daysLeft = Math.ceil((data.expiresAt - Date.now()) / 86400000);
  return issueLicense({ ...data, daysValid: daysLeft });
}

module.exports = { issueLicense, verifyLicense, bindMachine };
