# H Karate License Server — Deployment Guide

## Option 1: Railway (Recommended - Easiest)

### Step 1: Install Railway CLI
```powershell
npm install -g @railway/cli
```

### Step 2: Login to Railway
```powershell
railway login
```
This opens your browser. Sign in with GitHub.

### Step 3: Initialize Project
```powershell
cd "c:\Users\hosam\Documents\H Karate\v0.6\license-server"
railway init
```
- Select "Create new project"
- Name it: `hkarate-license-server`

### Step 4: Deploy
```powershell
railway up
```
Wait for deployment to complete (~2 minutes).

### Step 5: Set Environment Variables

#### Get your keys
```powershell
# Read private key
Get-Content keys.json | ConvertFrom-Json | Select-Object -ExpandProperty privateKey

# Generate admin secret
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

#### Set variables in Railway
```powershell
# Set admin secret
railway variables set ADMIN_SECRET="<paste-generated-secret>"

# Set private key (paste the FULL key including BEGIN/END lines)
railway variables set PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...your key here...
-----END PRIVATE KEY-----"

# Optional: Set Stripe keys if you have them
railway variables set STRIPE_SECRET_KEY="sk_live_..."
railway variables set STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Step 6: Get Your Server URL
```powershell
railway domain
```
Or visit https://railway.app/dashboard and copy the URL.

Example: `https://hkarate-license-server-production.up.railway.app`

### Step 7: Update validator.js
Open `v0.6/license/validator.js` and update line 26:
```js
const LICENSE_SERVER = 'https://hkarate-license-server-production.up.railway.app';
```

### Step 8: Test
```powershell
# Test the server is running
curl https://your-railway-url.up.railway.app/health
```

Should return: `{"status":"ok"}`

---

## Option 2: Render (Alternative)

### Step 1: Create Render Account
Go to https://render.com and sign up with GitHub.

### Step 2: Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select the `license-server` folder
4. Configure:
   - **Name:** hkarate-license-server
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free

### Step 3: Add Environment Variables
In Render dashboard, add:
- `ADMIN_SECRET` → (generate random string)
- `PRIVATE_KEY` → (paste from keys.json)
- `STRIPE_SECRET_KEY` → (optional, if using Stripe)
- `STRIPE_WEBHOOK_SECRET` → (optional, if using Stripe)

### Step 4: Deploy
Click "Create Web Service" → Wait 3-5 minutes

### Step 5: Get URL
Copy your Render URL (e.g., `https://hkarate-license-server.onrender.com`)

### Step 6: Update validator.js
Same as Railway step 7.

---

## Option 3: Heroku

### Step 1: Install Heroku CLI
Download from: https://devcenter.heroku.com/articles/heroku-cli

### Step 2: Login
```powershell
heroku login
```

### Step 3: Create App
```powershell
cd "c:\Users\hosam\Documents\H Karate\v0.6\license-server"
heroku create hkarate-license-server
```

### Step 4: Set Environment Variables
```powershell
heroku config:set ADMIN_SECRET="your-secret"
heroku config:set PRIVATE_KEY="$(Get-Content keys.json | ConvertFrom-Json | Select-Object -ExpandProperty privateKey)"
```

### Step 5: Deploy
```powershell
git init
git add .
git commit -m "Deploy license server"
git push heroku main
```

### Step 6: Get URL
```powershell
heroku open
```
Copy the URL and update validator.js.

---

## Testing Your Deployment

### 1. Health Check
```powershell
curl https://your-server-url.com/health
```
Expected: `{"status":"ok"}`

### 2. Issue a Test License (Admin)
```powershell
$headers = @{
    "x-admin-secret" = "YOUR_ADMIN_SECRET"
    "Content-Type" = "application/json"
}

$body = @{
    email = "test@example.com"
    plan = "monthly"
    daysValid = 30
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://your-server-url.com/issue" -Method POST -Headers $headers -Body $body
```

Should return a license file JSON.

### 3. Test from App
1. Rebuild your app: `cd ../.. && npm run build`
2. Install and run
3. Try to activate with a test license
4. Should connect to your server and activate successfully

---

## Security Checklist

- [ ] `keys.json` is NOT in git (check `.gitignore`)
- [ ] Environment variables are set (not hardcoded)
- [ ] ADMIN_SECRET is long and random (32+ characters)
- [ ] HTTPS is enabled (Railway/Render do this automatically)
- [ ] No private keys in logs or code

---

## Monitoring

### Railway
- View logs: `railway logs`
- View metrics: https://railway.app/dashboard

### Render
- View logs: Dashboard → Logs tab
- Set up alerts in Settings

### Heroku
- View logs: `heroku logs --tail`
- Set up monitoring with New Relic or Papertrail

---

## Troubleshooting

### "Invalid signature" errors
- Check public key in validator.js matches keys.json
- Ensure PRIVATE_KEY env var is set correctly with BEGIN/END lines

### "Unauthorized" errors
- Check ADMIN_SECRET matches between server and your requests
- Case-sensitive!

### Server not responding
- Check logs for errors
- Ensure PORT env var is set (Railway/Render set this automatically)
- Check if server is running: curl the /health endpoint

### Database full (in-memory array)
- Current implementation stores licenses in memory
- Restart = data loss
- For production: migrate to PostgreSQL or Firestore

---

## Next Steps After Deployment

1. ✅ Update LICENSE_SERVER in validator.js
2. ✅ Rebuild app: `npm run build`
3. ✅ Test license activation end-to-end
4. ✅ Set up Stripe (if using)
5. ✅ Configure webhook URL in Stripe dashboard
6. ✅ Add database (PostgreSQL/Firestore) for persistence

---

## Cost

**Railway:** Free tier includes $5 credit/month (~550 hours)  
**Render:** Free tier with automatic sleep after 15 min inactivity  
**Heroku:** Free tier deprecated, starts at $7/month  

**Recommendation:** Start with Railway (best free tier, no sleep).

---

**Your keys are already generated. Ready to deploy!**

Run: `railway login && railway init && railway up`
