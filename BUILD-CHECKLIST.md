# H Karate v0.6 — Build & Deploy Checklist

## Pre-Build Setup

### 1. Generate License Keys (ONCE ONLY)
```bash
cd license-server
npm install
node keygen.js
```
- Copy the **public key** output
- Paste into `license/validator.js` at line 20 (replace PUBLIC_KEY constant)
- **NEVER commit `keys.json` to git**

### 2. Deploy License Server
```bash
# Push license-server/ to Railway/Render/Heroku
git push railway main

# Set environment variables:
ADMIN_SECRET=<generate-long-random-string>
STRIPE_SECRET_KEY=<from-stripe-dashboard>
STRIPE_WEBHOOK_SECRET=<from-stripe-webhook-settings>
```

### 3. Update App Configuration
Edit `license/validator.js`:
```js
const LICENSE_SERVER = 'https://your-license-server.com';  // line 26
```

### 4. Configure Stripe (if using)
1. Create 3 products: Monthly / Yearly / Lifetime
2. Add metadata to each price: `plan = monthly` / `yearly` / `lifetime`
3. Create webhook → `https://your-server.com/stripe/webhook`
4. Events: `checkout.session.completed`, `invoice.paid`

## Build Process

### Install Dependencies
```powershell
cd "c:\Users\hosam\Documents\H Karate\v0.6"
npm install
```

### Build Installer + Portable
```powershell
npm run build
```
Output in `dist/`:
- `H-Karate-Scoring-Setup-0.6.0.exe` (NSIS installer)
- `H-Karate-Scoring-v0.6.0-portable.exe` (portable)

### Build Portable Only
```powershell
npm run build:portable
```

## Post-Build Testing

### Test on Clean Machine
- [ ] Fresh Windows 10/11 machine (VM recommended)
- [ ] No console window appears on launch
- [ ] License window shows on first run
- [ ] Drop license .json file → activates successfully
- [ ] Machine ID displayed correctly
- [ ] App opens after activation
- [ ] All features work (kumite/kata/judges/display)

### Test License Scenarios
- [ ] Valid license → works
- [ ] Invalid signature → rejected with clear message
- [ ] Expired license → rejected
- [ ] Copy license.dat to different machine → rejected (machine mismatch)
- [ ] Disconnect internet after activation → works (grace period)
- [ ] Disconnect > 7 days → blocked

### Test Core Features
- [ ] Kumite match with timer sounds at 30s/10s
- [ ] Kata 1v1 judging
- [ ] QR code scans correctly on mobile
- [ ] Web judges connect and send scores
- [ ] OBS overlay shows in Streamlabs/OBS
- [ ] Match history exports (JSON + CSV)
- [ ] Settings backup/restore
- [ ] Print match results with organization name
- [ ] All 6 languages switch correctly

## Release Process

### 1. Create GitHub Release
```bash
git tag v0.6.0
git push origin v0.6.0
```
- Upload both .exe files to GitHub release
- Write release notes (features + bug fixes)

### 2. Update Website
- Update download links to new version
- Update changelog
- Update screenshots if UI changed

### 3. Generate Test Licenses
```bash
curl -X POST https://your-server.com/issue \
  -H "x-admin-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","plan":"monthly","daysValid":30}'
```
Save output as `test-license.json`

### 4. Send to Beta Testers
- [ ] Email license files to beta testers
- [ ] Include quick start guide
- [ ] Provide support contact info

## Troubleshooting

### Build fails with "sign error"
- Ensure `"sign": null` in package.json (line 48)
- Or get a Windows code signing certificate

### License activation fails
- Check LICENSE_SERVER URL is correct
- Check license server is running and accessible
- Check public key matches server's public key
- Check server logs for errors

### Console window appears
- Verify `"console": false` in package.json build.win config
- Rebuild with `npm run build`

### QR code doesn't work
- Ensure URL is correct: `http://<your-ip>:12121`
- Check firewall allows port 12121
- Ensure device and judges on same network

## Quick Commands Reference

```powershell
# Development
npm start              # Run app (no console)
npm run dev            # Run with DevTools

# Building
npm run build          # Build both installer + portable
npm run build:portable # Build portable only

# Testing
node --check main.js   # Syntax check
node --check renderer/js/*.js  # Check all JS files

# License Server
cd license-server
node keygen.js         # Generate keypair (ONCE)
npm start              # Run locally on port 3456
```

## Support Contacts

**Issues:** https://github.com/hosam-sheboun/h-karate/issues  
**Email:** [Add support email]  
**Discord:** [Add Discord invite]  
**Documentation:** https://h-karate-app.web.app/docs

---

**Last Updated:** September 1, 2026  
**Version:** 0.6.0  
**Build:** Production
