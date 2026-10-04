/**
 * H Karate License Server - Vercel Serverless Function
 * All license endpoints in one function
 */

const crypto = require('crypto');

// In-memory storage (will use Vercel KV for persistence later if needed)
// For now, we'll use a simple approach - you'll manage licenses via admin panel
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'hkarate-admin-2026-CHANGE-THIS';

const PRIVATE_KEY = process.env.PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEINvqpTpCBzjmgIEn/9HdnS9fXFLwmcEkmPPdNWHIVcA4
-----END PRIVATE KEY-----`;

const PUBLIC_KEY = process.env.PUBLIC_KEY || `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEApwudg1NqHYrBuDBuO8YEp0rIbH6i9KwHaf0ktVEh77w=
-----END PUBLIC KEY-----`;

function uuid() { 
  return crypto.randomUUID(); 
}

function issueLicense({email, plan, machineId = '', daysValid, licenseId}) {
  const now = Date.now();
  const expiresAt = now + daysValid * 86400000;
  const payloadObj = {email, plan, issuedAt: now, expiresAt, machineId, licenseId, v: 1};
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64');
  const privateKeyObject = crypto.createPrivateKey({key: PRIVATE_KEY, format: 'pem', type: 'pkcs8'});
  const signature = crypto.sign(null, Buffer.from(payloadB64), privateKeyObject).toString('base64');
  return {payload: payloadB64, signature};
}

function verifyLicense({payload, signature}) {
  try {
    const publicKeyObject = crypto.createPublicKey({key: PUBLIC_KEY, format: 'pem', type: 'spki'});
    const ok = crypto.verify(null, Buffer.from(payload), publicKeyObject, Buffer.from(signature, 'base64'));
    if (!ok) return {valid: false, reason: 'invalid_signature'};
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    if (Date.now() > data.expiresAt) return {valid: false, reason: 'expired', data};
    return {valid: true, reason: 'ok', data};
  } catch (e) {
    return {valid: false, reason: 'malformed'};
  }
}

function bindMachine({payload, signature}, machineId) {
  const check = verifyLicense({payload, signature});
  if (!check.valid) return null;
  const data = check.data;
  data.machineId = machineId;
  const daysLeft = Math.ceil((data.expiresAt - Date.now()) / 86400000);
  return issueLicense({...data, daysValid: daysLeft});
}

function adminAuth(req) {
  const secret = req.headers['x-admin-secret'] || req.headers['authorization']?.replace('Bearer ', '');
  return secret === ADMIN_SECRET;
}

// Simple in-memory license storage (resets on deploy, use Vercel KV for persistence)
const licenses = new Map();

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret, authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const {action} = req.query;
  
  try {
    // Health check
    if (action === 'health' && req.method === 'GET') {
      return res.json({status: 'ok', timestamp: Date.now(), licenses: licenses.size});
    }
    
    // Activate license
    if (action === 'activate' && req.method === 'POST') {
      const {licenseFile, machineId} = req.body;
      if (!licenseFile || !machineId) return res.status(400).json({error: 'missing_fields'});
      
      const check = verifyLicense(licenseFile);
      if (!check.valid) return res.status(403).json({error: check.reason});
      
      const {licenseId} = check.data;
      const record = licenses.get(licenseId);
      if (!record) return res.status(403).json({error: 'unknown_license'});
      
      if (record.revoked) return res.status(403).json({error: 'revoked'});
      if (record.machineId && record.machineId !== machineId) return res.status(403).json({error: 'machine_mismatch'});
      
      if (!record.machineId) {
        record.machineId = machineId;
        record.activations = (record.activations || 0) + 1;
        record.lastActivated = Date.now();
        licenses.set(licenseId, record);
      }
      
      const newFile = bindMachine(licenseFile, machineId);
      if (!newFile) return res.status(500).json({error: 'sign_failed'});
      
      return res.json({ok: true, licenseFile: newFile, expiresAt: check.data.expiresAt, plan: check.data.plan});
    }
    
    // Validate license
    if (action === 'validate' && req.method === 'POST') {
      const {licenseFile, machineId} = req.body;
      if (!licenseFile || !machineId) return res.status(400).json({error: 'missing_fields'});
      
      const check = verifyLicense(licenseFile);
      if (!check.valid) return res.status(403).json({error: check.reason});
      
      const {licenseId} = check.data;
      const record = licenses.get(licenseId);
      if (!record) return res.status(403).json({error: 'unknown_license'});
      
      if (record.revoked) return res.status(403).json({error: 'revoked'});
      if (record.machineId && record.machineId !== machineId) return res.status(403).json({error: 'machine_mismatch'});
      
      return res.json({ok: true, expiresAt: check.data.expiresAt, plan: check.data.plan, email: check.data.email});
    }
    
    // Issue license (admin only)
    if (action === 'issue' && req.method === 'POST') {
      if (!adminAuth(req)) return res.status(401).json({error: 'unauthorized'});
      
      const {email, plan, daysValid} = req.body;
      if (!email || !plan || !daysValid) return res.status(400).json({error: 'missing_fields'});
      
      const licenseId = uuid();
      const days = parseInt(daysValid) || 30;
      const licenseFile = issueLicense({email, plan, daysValid: days, licenseId});
      
      licenses.set(licenseId, {
        email, plan, issuedAt: Date.now(), expiresAt: Date.now() + days * 86400000,
        machineId: '', revoked: false, activations: 0
      });
      
      return res.json({ok: true, licenseId, licenseFile});
    }
    
    // Revoke license (admin only)
    if (action === 'revoke' && req.method === 'POST') {
      if (!adminAuth(req)) return res.status(401).json({error: 'unauthorized'});
      
      const {licenseId} = req.body;
      const record = licenses.get(licenseId);
      if (!record) return res.status(404).json({error: 'not_found'});
      
      record.revoked = true;
      record.revokedAt = Date.now();
      licenses.set(licenseId, record);
      return res.json({ok: true});
    }
    
    // List licenses (admin only)
    if (action === 'licenses' && req.method === 'GET') {
      if (!adminAuth(req)) return res.status(401).json({error: 'unauthorized'});
      
      const allLicenses = [];
      licenses.forEach((data, licenseId) => {
        allLicenses.push({licenseId, ...data});
      });
      return res.json(allLicenses);
    }
    
    return res.status(404).json({error: 'not_found'});
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({error: 'internal_error', message: error.message});
  }
};
