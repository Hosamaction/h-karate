/**
 * generate-license.js — Manual License Generator
 * 
 * Usage:
 *   node generate-license.js <email> <plan> <days>
 * 
 * Examples:
 *   node generate-license.js user@example.com monthly 30
 *   node generate-license.js user@example.com yearly 365
 *   node generate-license.js user@example.com lifetime 36500
 */

const { issueLicense } = require('./license-core');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const [,, email, plan, daysValid] = process.argv;

if (!email || !plan || !daysValid) {
  console.error('Usage: node generate-license.js <email> <plan> <days>');
  console.error('');
  console.error('Examples:');
  console.error('  node generate-license.js user@example.com monthly 30');
  console.error('  node generate-license.js user@example.com yearly 365');
  console.error('  node generate-license.js user@example.com lifetime 36500');
  console.error('');
  console.error('Plans: monthly, yearly, lifetime, 2year');
  process.exit(1);
}

// Validate plan
const validPlans = ['monthly', 'yearly', 'lifetime', '2year'];
if (!validPlans.includes(plan)) {
  console.error(`Invalid plan: ${plan}`);
  console.error(`Valid plans: ${validPlans.join(', ')}`);
  process.exit(1);
}

// Generate unique license ID
const licenseId = crypto.randomUUID();
const days = parseInt(daysValid);

console.log('─'.repeat(60));
console.log('🔑 H Karate License Generator');
console.log('─'.repeat(60));
console.log('');
console.log(`Email:      ${email}`);
console.log(`Plan:       ${plan}`);
console.log(`Duration:   ${days} days`);
console.log(`License ID: ${licenseId}`);
console.log('');

try {
  // Generate the license
  const licenseFile = issueLicense({
    email,
    plan,
    machineId: '', // Will be bound on first activation
    daysValid: days,
    licenseId
  });

  // Calculate expiry date
  const expiresAt = new Date(Date.now() + days * 86400000);
  const issuedAt = new Date();

  console.log('✅ License generated successfully!');
  console.log('');
  console.log(`Issued At:  ${issuedAt.toISOString()}`);
  console.log(`Expires At: ${expiresAt.toISOString()}`);
  console.log('');

  // Save to file
  const filename = `${email.replace(/[^a-zA-Z0-9]/g, '_')}_${plan}_${licenseId.split('-')[0]}.json`;
  const filepath = path.join(__dirname, 'generated', filename);
  
  // Create generated directory if it doesn't exist
  const dir = path.join(__dirname, 'generated');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write license file
  fs.writeFileSync(filepath, JSON.stringify(licenseFile, null, 2), 'utf8');
  
  console.log('📄 License file saved to:');
  console.log(`   ${filepath}`);
  console.log('');

  // Also save to database (licenses.json)
  const DB_PATH = path.join(__dirname, 'licenses.json');
  let db = {};
  try {
    db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    db = {};
  }

  db[licenseId] = {
    email,
    plan,
    issuedAt: Date.now(),
    expiresAt: Date.now() + days * 86400000,
    machineId: '', // Will be set on first activation
    revoked: false,
    activations: 0
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  console.log('💾 License added to database (licenses.json)');
  console.log('');

  // Display the license content
  console.log('─'.repeat(60));
  console.log('📋 License File Content (send this to customer):');
  console.log('─'.repeat(60));
  console.log(JSON.stringify(licenseFile, null, 2));
  console.log('─'.repeat(60));
  console.log('');
  console.log('✉️  Send this file to: ' + email);
  console.log('');

} catch (error) {
  console.error('❌ Error generating license:', error.message);
  console.error(error.stack);
  process.exit(1);
}
