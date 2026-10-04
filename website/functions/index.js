/**
 * H Karate License Server - Firebase Functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

const ADMIN_SECRET = process.env.ADMIN_SECRET || "hkarate-admin-2026-CHANGE-THIS";

const PRIVATE_KEY = process.env.PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEINvqpTpCBzjmgIEn/9HdnS9fXFLwmcEkmPPdNWHIVcA4
-----END PRIVATE KEY-----`;

const PUBLIC_KEY = process.env.PUBLIC_KEY || `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEApwudg1NqHYrBuDBuO8YEp0rIbH6i9KwHaf0ktVEh77w=
-----END PUBLIC KEY-----`;

function uuid() { return crypto.randomUUID(); }

function issueLicense({email, plan, machineId = "", daysValid, licenseId}) {
  const now = Date.now();
  const expiresAt = now + daysValid * 86400000;
  const payloadObj = {email, plan, issuedAt: now, expiresAt, machineId, licenseId, v: 1};
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString("base64");
  const privateKeyObject = crypto.createPrivateKey({key: PRIVATE_KEY, format: "pem", type: "pkcs8"});
  const signature = crypto.sign(null, Buffer.from(payloadB64), privateKeyObject).toString("base64");
  return {payload: payloadB64, signature};
}

function verifyLicense({payload, signature}) {
  try {
    const publicKeyObject = crypto.createPublicKey({key: PUBLIC_KEY, format: "pem", type: "spki"});
    const ok = crypto.verify(null, Buffer.from(payload), publicKeyObject, Buffer.from(signature, "base64"));
    if (!ok) return {valid: false, reason: "invalid_signature"};
    const data = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    if (Date.now() > data.expiresAt) return {valid: false, reason: "expired", data};
    return {valid: true, reason: "ok", data};
  } catch (e) {
    return {valid: false, reason: "malformed"};
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
  const secret = req.headers["x-admin-secret"] || req.headers["authorization"]?.replace("Bearer ", "");
  return secret === ADMIN_SECRET;
}

exports.license = onRequest({cors: true}, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, x-admin-secret, authorization");
  
  if (req.method === "OPTIONS") return res.status(200).send();
  
  const path = req.path || "/";
  
  try {
    if (path === "/health" && req.method === "GET") {
      const snapshot = await db.collection("licenses").count().get();
      return res.json({status: "ok", timestamp: Date.now(), licenses: snapshot.data().count});
    }
    
    if (path === "/activate" && req.method === "POST") {
      const {licenseFile, machineId} = req.body;
      if (!licenseFile || !machineId) return res.status(400).json({error: "missing_fields"});
      
      const check = verifyLicense(licenseFile);
      if (!check.valid) return res.status(403).json({error: check.reason});
      
      const {licenseId} = check.data;
      const doc = await db.collection("licenses").doc(licenseId).get();
      if (!doc.exists) return res.status(403).json({error: "unknown_license"});
      
      const record = doc.data();
      if (record.revoked) return res.status(403).json({error: "revoked"});
      if (record.machineId && record.machineId !== machineId) return res.status(403).json({error: "machine_mismatch"});
      
      if (!record.machineId) {
        await db.collection("licenses").doc(licenseId).update({
          machineId, activations: (record.activations || 0) + 1, lastActivated: Date.now()
        });
      }
      
      const newFile = bindMachine(licenseFile, machineId);
      if (!newFile) return res.status(500).json({error: "sign_failed"});
      
      return res.json({ok: true, licenseFile: newFile, expiresAt: check.data.expiresAt, plan: check.data.plan});
    }
    
    if (path === "/validate" && req.method === "POST") {
      const {licenseFile, machineId} = req.body;
      if (!licenseFile || !machineId) return res.status(400).json({error: "missing_fields"});
      
      const check = verifyLicense(licenseFile);
      if (!check.valid) return res.status(403).json({error: check.reason});
      
      const {licenseId} = check.data;
      const doc = await db.collection("licenses").doc(licenseId).get();
      if (!doc.exists) return res.status(403).json({error: "unknown_license"});
      
      const record = doc.data();
      if (record.revoked) return res.status(403).json({error: "revoked"});
      if (record.machineId && record.machineId !== machineId) return res.status(403).json({error: "machine_mismatch"});
      
      return res.json({ok: true, expiresAt: check.data.expiresAt, plan: check.data.plan, email: check.data.email});
    }
    
    if (path === "/issue" && req.method === "POST") {
      if (!adminAuth(req)) return res.status(401).json({error: "unauthorized"});
      
      const {email, plan, daysValid} = req.body;
      if (!email || !plan || !daysValid) return res.status(400).json({error: "missing_fields"});
      
      const licenseId = uuid();
      const days = parseInt(daysValid) || 30;
      const licenseFile = issueLicense({email, plan, daysValid: days, licenseId});
      
      await db.collection("licenses").doc(licenseId).set({
        email, plan, issuedAt: Date.now(), expiresAt: Date.now() + days * 86400000,
        machineId: "", revoked: false, activations: 0
      });
      
      return res.json({ok: true, licenseId, licenseFile});
    }
    
    if (path === "/revoke" && req.method === "POST") {
      if (!adminAuth(req)) return res.status(401).json({error: "unauthorized"});
      
      const {licenseId} = req.body;
      const doc = await db.collection("licenses").doc(licenseId).get();
      if (!doc.exists) return res.status(404).json({error: "not_found"});
      
      await db.collection("licenses").doc(licenseId).update({revoked: true, revokedAt: Date.now()});
      return res.json({ok: true});
    }
    
    if (path === "/licenses" && req.method === "GET") {
      if (!adminAuth(req)) return res.status(401).json({error: "unauthorized"});
      
      const snapshot = await db.collection("licenses").get();
      const licenses = [];
      snapshot.forEach((doc) => licenses.push({licenseId: doc.id, ...doc.data()}));
      return res.json(licenses);
    }
    
    return res.status(404).json({error: "not_found"});
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({error: "internal_error"});
  }
});
