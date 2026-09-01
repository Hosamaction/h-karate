/**
 * server.js — H Karate License Server
 *
 * Deploy on any Node.js host (Railway, Render, VPS).
 * Set environment variables in .env (see .env.example).
 *
 * Endpoints:
 *   POST /activate        — app sends machineId + licenseFile, server binds and returns new signed file
 *   POST /validate        — app sends licenseFile + machineId, server confirms still valid / not revoked
 *   POST /revoke          — admin revokes a license by licenseId
 *   POST /stripe/webhook  — Stripe calls this after payment → auto-generates license file
 *   GET  /admin/licenses  — list all licenses (protected by ADMIN_SECRET header)
 */

require('dotenv').config();
const express  = require('express');
const crypto   = require('crypto');
const fs       = require('fs');
const path     = require('path');
const { issueLicense, verifyLicense, bindMachine } = require('./license-core');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── In-memory DB (replace with SQLite/Postgres in production) ────────────────
// Structure: { [licenseId]: { email, plan, issuedAt, expiresAt, machineId, revoked, activations } }
const DB_PATH = path.join(__dirname, 'licenses.json');
let db = {};
function loadDB()  { try { db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch(_) { db = {}; } }
function saveDB()  { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8'); }
loadDB();

// ── Middleware ────────────────────────────────────────────────────────────────
// CORS - allow admin panel to access from any origin
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Raw body needed for Stripe webhook signature verification
app.use('/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

function adminAuth(req, res, next) {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

function uuid() { return crypto.randomUUID(); }

// ── POST /activate ────────────────────────────────────────────────────────────
// App sends: { licenseFile: { payload, signature }, machineId: "sha256hex" }
// Server: verifies, checks not revoked, binds machineId if first activation, returns new signed file
app.post('/activate', (req, res) => {
  const { licenseFile, machineId } = req.body;
  if (!licenseFile || !machineId) return res.status(400).json({ error: 'missing_fields' });

  const check = verifyLicense(licenseFile);
  if (!check.valid) return res.status(403).json({ error: check.reason });

  const { licenseId } = check.data;
  const record = db[licenseId];
  if (!record) return res.status(403).json({ error: 'unknown_license' });
  if (record.revoked) return res.status(403).json({ error: 'revoked' });

  // Machine binding: first activation sets the machine, subsequent must match
  if (record.machineId && record.machineId !== machineId) {
    return res.status(403).json({ error: 'machine_mismatch' });
  }

  // Bind machine on first activation
  if (!record.machineId) {
    record.machineId = machineId;
    record.activations = (record.activations || 0) + 1;
    saveDB();
  }

  // Re-sign with machineId bound
  const newFile = bindMachine(licenseFile, machineId);
  if (!newFile) return res.status(500).json({ error: 'sign_failed' });

  res.json({ ok: true, licenseFile: newFile, expiresAt: check.data.expiresAt, plan: check.data.plan });
});

// ── POST /validate ────────────────────────────────────────────────────────────
// App sends: { licenseFile: { payload, signature }, machineId }
// Server: verifies signature, checks not revoked, checks machineId matches
app.post('/validate', (req, res) => {
  const { licenseFile, machineId } = req.body;
  if (!licenseFile || !machineId) return res.status(400).json({ error: 'missing_fields' });

  const check = verifyLicense(licenseFile);
  if (!check.valid) return res.status(403).json({ error: check.reason });

  const { licenseId } = check.data;
  const record = db[licenseId];
  if (!record) return res.status(403).json({ error: 'unknown_license' });
  if (record.revoked) return res.status(403).json({ error: 'revoked' });
  if (record.machineId && record.machineId !== machineId) {
    return res.status(403).json({ error: 'machine_mismatch' });
  }

  res.json({ ok: true, expiresAt: check.data.expiresAt, plan: check.data.plan, email: check.data.email });
});

// ── POST /revoke ──────────────────────────────────────────────────────────────
app.post('/revoke', adminAuth, (req, res) => {
  const { licenseId } = req.body;
  if (!db[licenseId]) return res.status(404).json({ error: 'not_found' });
  db[licenseId].revoked = true;
  saveDB();
  res.json({ ok: true });
});

// ── POST /issue (admin manual issue) ─────────────────────────────────────────
app.post('/issue', adminAuth, (req, res) => {
  const { email, plan, daysValid } = req.body;
  if (!email || !plan || !daysValid) return res.status(400).json({ error: 'missing_fields' });
  const licenseId = uuid();
  const days = parseInt(daysValid) || 30;
  const licenseFile = issueLicense({ email, plan, daysValid: days, licenseId });
  db[licenseId] = { email, plan, issuedAt: Date.now(), expiresAt: Date.now() + days * 86400000, machineId: '', revoked: false, activations: 0 };
  saveDB();
  res.json({ ok: true, licenseId, licenseFile });
});

// ── GET /admin/licenses ───────────────────────────────────────────────────────
app.get('/admin/licenses', adminAuth, (req, res) => {
  res.json(Object.entries(db).map(([id, r]) => ({ licenseId: id, ...r })));
});

// ── GET /health ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), licenses: Object.keys(db).length });
});

// ── POST /stripe/webhook ──────────────────────────────────────────────────────
app.post('/stripe/webhook', (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (e) {
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid') {
    const obj   = event.data.object;
    const email = obj.customer_email || obj.customer_details?.email || '';
    // Determine plan from metadata or price
    const plan  = obj.metadata?.plan || 'monthly';
    const days  = plan === 'yearly' ? 365 : plan === 'lifetime' ? 36500 : 30;
    const licenseId  = uuid();
    const licenseFile = issueLicense({ email, plan, daysValid: days, licenseId });
    db[licenseId] = { email, plan, issuedAt: Date.now(), expiresAt: Date.now() + days * 86400000, machineId: '', revoked: false, activations: 0 };
    saveDB();

    // In production: email the licenseFile JSON to the customer here
    // e.g. using SendGrid, Resend, Nodemailer, etc.
    console.log(`[STRIPE] License issued for ${email} — ${plan} — ID: ${licenseId}`);
    console.log('[STRIPE] License file to email:', JSON.stringify(licenseFile));
  }

  res.json({ received: true });
});

app.listen(PORT, () => console.log(`H Karate License Server running on port ${PORT}`));
