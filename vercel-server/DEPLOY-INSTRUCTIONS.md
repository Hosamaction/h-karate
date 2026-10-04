# How to Deploy H Karate License Server to Vercel (FREE - No Credit Card)

## Step 1: Sign up for Vercel
1. Go to: https://vercel.com/signup
2. Sign up with **GitHub** (recommended) or Email
3. **No credit card required!**

## Step 2: Deploy via GitHub (Easiest Method)

### Option A: Deploy from GitHub (Recommended)
1. Push the `vercel-server` folder to a GitHub repository
2. Go to: https://vercel.com/new
3. Click **"Import Git Repository"**
4. Select your H Karate repository
5. **Root Directory**: Set to `vercel-server`
6. Click **"Deploy"**
7. Done! Your license server will be live at: `https://your-project-name.vercel.app`

### Option B: Deploy via Vercel CLI (Alternative)
1. Open PowerShell in the `vercel-server` folder
2. Run: `npx vercel login`
3. Follow login prompts (no credit card needed)
4. Run: `npx vercel`
5. Answer prompts:
   - Set up and deploy? **Y**
   - Which scope? Choose your account
   - Link to existing project? **N**
   - Project name? **hkarate-license-server** (or your choice)
   - Directory? Press Enter (current directory)
   - Override settings? **N**
6. Wait for deployment
7. You'll get a URL like: `https://hkarate-license-server.vercel.app`

## Step 3: Test Your Server
Visit: `https://your-url.vercel.app/`

You should see:
```json
{"status":"ok","timestamp":1725235200000,"licenses":0}
```

## Step 4: Update Your App Code

You need to update 2 files in `v0.6` folder:

### File 1: `v0.6/license/validator.js`
Find this line:
```javascript
const LICENSE_SERVER = 'https://hkarate-license-server-production.up.railway.app';
```

Change to:
```javascript
const LICENSE_SERVER = 'https://YOUR-VERCEL-URL.vercel.app';
```

### File 2: `v0.6/admin-panel.html`
Find this line:
```javascript
const API_URL = 'https://hkarate-license-server-production.up.railway.app';
```

Change to:
```javascript
const API_URL = 'https://YOUR-VERCEL-URL.vercel.app';
```

## Step 5: Generate a Test License

1. Open `v0.6/admin-panel.html` in your browser
2. Use admin secret: **hkarate-admin-2026-CHANGE-THIS**
3. Generate a test license:
   - Email: test@example.com
   - Plan: monthly
   - Days Valid: 30
4. Save the generated license file
5. Test it in your app

## Important Notes

### Storage Warning
The current setup uses **in-memory storage** which means:
- ✅ Licenses are cryptographically signed and secure
- ⚠️ License database resets when you redeploy
- 💡 For production, you'll need persistent storage (see below)

### For Persistent Storage (Optional)
If you want licenses to persist across deployments, use one of these **free** options:

1. **MongoDB Atlas** (Free 512MB)
   - Sign up: https://www.mongodb.com/cloud/atlas/register
   - No credit card for free tier
   - Add connection string to Vercel env vars

2. **Supabase** (Free PostgreSQL)
   - Sign up: https://supabase.com
   - No credit card needed
   - Get connection string

3. **Just generate licenses as needed**
   - Current system works fine
   - Generate license → send to customer
   - Signature prevents forgery

### Changing Admin Secret (Recommended)
1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add variable:
   - Name: `ADMIN_SECRET`
   - Value: `your-new-secret-here`
4. Click **Save**
5. Redeploy (Vercel → Deployments → click "Redeploy")

## Your License Server URLs

Once deployed, these will be your endpoints:

- Health: `GET https://your-url.vercel.app/`
- Health: `GET https://your-url.vercel.app/license/health`
- Activate: `POST https://your-url.vercel.app/license/activate`
- Validate: `POST https://your-url.vercel.app/license/validate`
- Issue: `POST https://your-url.vercel.app/license/issue` (admin)
- Revoke: `POST https://your-url.vercel.app/license/revoke` (admin)
- List: `GET https://your-url.vercel.app/license/licenses` (admin)

## Troubleshooting

### "Function Timeout"
- Free tier has 10-second limit (plenty for license operations)
- If it happens, check Vercel logs

### "CORS Error"
- Already handled in code with `Access-Control-Allow-Origin: *`
- If issues persist, check browser console

### "Cannot read property..."
- Check request body format in admin panel
- Ensure JSON is valid

## Need Help?
Check Vercel deployment logs:
1. Go to: https://vercel.com/dashboard
2. Click your project
3. Click **Deployments**
4. Click latest deployment
5. View **Function Logs**
