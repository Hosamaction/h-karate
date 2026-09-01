/**
 * keygen.js — Run ONCE on your server: node keygen.js
 * Generates an Ed25519 keypair and saves to keys.json
 * NEVER commit keys.json or share the privateKey.
 */
const { generateKeyPairSync } = require('crypto');
const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, 'keys.json');
if (fs.existsSync(out)) {
  console.log('keys.json already exists. Delete it first if you want to regenerate.');
  process.exit(0);
}

const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding:  { type: 'spki',  format: 'pem' }
});

fs.writeFileSync(out, JSON.stringify({ privateKey, publicKey }, null, 2), 'utf8');
console.log('✅ keys.json generated.');
console.log('');
console.log('Copy this publicKey into v0.6/license/validator.js PUBLIC_KEY constant:');
console.log('');
console.log(publicKey);
