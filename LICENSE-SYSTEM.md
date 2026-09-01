# H Karate v0.6 — Licensing System Setup Guide

## Architecture

```
Your Server (license-server/)        User Machine (v0.6 app)
─────────────────────────────        ───────────────────────
keygen.js  → Ed25519 keypair         main.js boots
server.js  → Express API             validator.js:
           → Stripe webhook            1. decrypt license.dat (AES-256)
           → issues signed .json       2. verify Ed25519 signature
           → validates/revokes         3. check expiry
                                       4. check machine ID
                                       5. online re-check (7-day grace)
```

## Step 1 — Generate your keypair (ONCE only)

```bash
cd license-server
npm install
node keygen.js
```

Prints your public key. Copy it into `license/validator.js` replacing `PUBLIC_KEY`.
**Never commit keys.json. Never share privateKey.**

## Step 2 — Deploy the license server

1. Push `license-server/` to Railway / Render / any VPS
2. Set env vars (copy `.env.example` to `.env`):
   - `ADMIN_SECRET` — long random string
   - `STRIPE_SECRET_KEY` — from Stripe dashboard
   - `STRIPE_WEBHOOK_SECRET` — from Stripe webhook settings
3. Set `LICENSE_SERVER` in `license/validator.js` to your deployed URL

## Step 3 — Stripe setup

1. Create 3 products: Monthly / Yearly / Lifetime
2. Add metadata to each price: `plan = monthly` / `yearly` / `lifetime`
3. Create webhook → `https://your-server.com/stripe/webhook`
   Events: `checkout.session.completed`, `invoice.paid`
4. Add email sending in `server.js` Stripe handler (Resend/SendGrid)

## Step 4 — Build the app

```bash
cd v0.6
npm install
npm run build
```

## License flow

**Purchase:** Customer pays → Stripe webhook → server generates signed JSON → emailed to customer

**Activation:**
1. App launches → no license.dat → shows license.html
2. Customer drops .json file
3. App sends file + machine fingerprint to /activate
4. Server verifies, binds machine ID, returns re-signed file
5. App saves AES-256 encrypted as license.dat (key = SHA-256 of machine ID)
6. App opens

**Every launch:**
1. Decrypt license.dat with machine-derived key
2. Verify Ed25519 signature (offline)
3. Check expiry
4. Check machine ID
5. Online /validate call → revoked = instant lock, offline = 7-day grace

## Security layers

| Layer | Stops |
|-------|-------|
| Ed25519 signature | Forged/modified license files |
| Machine ID binding | Sharing license across machines |
| AES-256 encrypted storage | Copying license.dat to another machine |
| Online re-validation | Revoked licenses |
| 7-day grace period | Legitimate offline use at tournaments |
| Expiry in signed payload | Extending expiry without your private key |

## Admin API

All require header: `x-admin-secret: YOUR_ADMIN_SECRET`

```bash
# Issue manually
curl -X POST https://your-server.com/issue \
  -H "x-admin-secret: SECRET" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","plan":"monthly","daysValid":30}'

# Revoke
curl -X POST https://your-server.com/revoke \
  -H "x-admin-secret: SECRET" \
  -d '{"licenseId":"uuid-here"}'

# List all
curl https://your-server.com/admin/licenses \
  -H "x-admin-secret: SECRET"
```

## Production checklist

- [ ] Run `node keygen.js`, copy public key into validator.js
- [ ] Set `LICENSE_SERVER` URL in validator.js
- [ ] Deploy license-server with env vars set
- [ ] Add email delivery in server.js Stripe handler
- [ ] Replace JSON file DB with SQLite/Postgres
- [ ] Add `express-rate-limit` to /activate and /validate
- [ ] Build app: `npm run build`
