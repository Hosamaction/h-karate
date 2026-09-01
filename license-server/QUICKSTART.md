# 🚀 License Server — Quick Deploy (5 Minutes)

## Step 1: Deploy to Railway

Run this script:
```powershell
.\deploy-railway.bat
```

**What it does:**
1. Installs Railway CLI (if needed)
2. Logs you into Railway (opens browser)
3. Creates a new project
4. Deploys your server

**Time:** 3 minutes

---

## Step 2: Set Environment Variables

### Generate Admin Secret
```powershell
$secret = [System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
Write-Host "Generated secret: $secret"
railway variables set ADMIN_SECRET="$secret"
```

### Set Private Key
```powershell
# Read the private key
$key = (Get-Content keys.json | ConvertFrom-Json).privateKey
Write-Host $key

# Copy the full key (including BEGIN/END lines) and run:
railway variables set PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MCAw...your key here...
-----END PRIVATE KEY-----"
```

**Time:** 1 minute

---

## Step 3: Get Your Server URL

```powershell
railway domain
```

Example output: `https://hkarate-license-server-production.up.railway.app`

**Time:** 10 seconds

---

## Step 4: Update validator.js

Open: `c:\Users\hosam\Documents\H Karate\v0.6\license\validator.js`

Line 26, change:
```js
const LICENSE_SERVER = 'https://your-license-server.com';
```

To:
```js
const LICENSE_SERVER = 'https://hkarate-license-server-production.up.railway.app';
```

**Time:** 30 seconds

---

## Step 5: Test It Works

```powershell
# Test health endpoint
curl https://your-railway-url.up.railway.app/health
```

Should return: `{"status":"ok","timestamp":...,"licenses":0}`

**Time:** 10 seconds

---

## ✅ Done!

Your license server is live and ready!

**Next steps:**
1. Rebuild your app: `cd ..\.. && npm run build`
2. Create GitHub release
3. Deploy website
4. Launch! 🎉

---

## Troubleshooting

### "railway: command not found"
```powershell
npm install -g @railway/cli
```

### Can't see environment variables
```powershell
railway variables
```

### Check logs
```powershell
railway logs
```

### Redeploy after changes
```powershell
railway up
```

---

## Cost

**Railway Free Tier:**
- $5 credit/month (~550 hours of runtime)
- Perfect for this use case
- No credit card required initially

---

**Total deployment time: ~5 minutes** ⏱️
