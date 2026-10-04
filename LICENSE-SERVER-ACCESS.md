# 🔑 H Karate License Server - Access Guide

## 📍 Your License Server Location

**Server URL:** `https://hkarate-license-server-production.up.railway.app`

**Hosted on:** Railway (https://railway.app)

---

## 🎯 How to Access Your License Server

### 1️⃣ **Railway Dashboard Access**

1. Go to: https://railway.app
2. Log in with your account (check which email you used)
3. Look for project: **"hkarate-license-server-production"**
4. Click on it to access:
   - Server logs
   - Environment variables
   - Deployment history
   - Database (licenses.json)

### 2️⃣ **Admin Panel (Web Interface)**

**Local Admin Panel:**
- File: `v0.6/admin-panel.html`
- Open it in your browser (double-click the file)
- It connects to your Railway server

**OR use the website admin panel:**
- Go to: https://h-karate-app.web.app/admin.html

**Admin Panel Features:**
- 📝 Generate new licenses
- 📊 View all licenses
- 🗑️ Revoke licenses
- 📈 See activation statistics

**Admin Secret:** You need to set this in Railway environment variables
- Variable name: `ADMIN_SECRET`
- This is your password to access admin functions

---

## 🔧 Server Endpoints

Your server has these endpoints:

1. **POST /issue** - Manually generate a license
   - Headers: `x-admin-secret: YOUR_SECRET`
   - Body: `{ email, plan, daysValid }`

2. **POST /activate** - App calls this on first run
   - Body: `{ licenseFile, machineId }`

3. **POST /validate** - App calls this every 7 days
   - Body: `{ licenseFile, machineId }`

4. **POST /revoke** - Revoke a license
   - Headers: `x-admin-secret: YOUR_SECRET`
   - Body: `{ licenseId }`

5. **GET /admin/licenses** - List all licenses
   - Headers: `x-admin-secret: YOUR_SECRET`

6. **GET /health** - Check server status
   - Public endpoint
   - Returns: server status and license count

---

## 🎫 How to Generate Licenses Manually

### **Method 1: Using the Script (Recommended)**

```bash
cd v0.6/license-server
node generate-license.js <email> <plan> <days>
```

**Examples:**
```bash
# Monthly license (30 days)
node generate-license.js customer@email.com monthly 30

# Yearly license (365 days)
node generate-license.js customer@email.com yearly 365

# 2-Year license (730 days)
node generate-license.js customer@email.com 2year 730

# Lifetime license (100 years = 36500 days)
node generate-license.js customer@email.com lifetime 36500
```

**Output:**
- License file saved to: `v0.6/license-server/generated/`
- Also added to database: `v0.6/license-server/licenses.json`
- JSON content to send to customer

### **Method 2: Using Admin Panel**

1. Open `v0.6/admin-panel.html` in browser
2. Enter admin secret
3. Fill in customer details:
   - Email
   - Plan (monthly/yearly/2year/lifetime)
   - Days (30/365/730/36500)
4. Click "Generate License"
5. Download the `.json` file
6. Send to customer via email

### **Method 3: Using API Directly**

```bash
curl -X POST https://hkarate-license-server-production.up.railway.app/issue \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{
    "email": "customer@email.com",
    "plan": "yearly",
    "daysValid": 365
  }'
```

---

## 🔐 Important Files & Locations

### **On Your Computer:**

1. **Admin Panel:** `v0.6/admin-panel.html`
   - Open in browser to manage licenses

2. **License Generator:** `v0.6/license-server/generate-license.js`
   - Run with Node.js to create licenses

3. **Server Code:** `v0.6/license-server/server.js`
   - Main server file (running on Railway)

4. **License Database:** `v0.6/license-server/licenses.json`
   - All issued licenses stored here
   - Backup this file regularly!

5. **Keys:** Environment variables on Railway
   - `PRIVATE_KEY` - Keep secret!
   - `PUBLIC_KEY` - Embedded in app
   - `ADMIN_SECRET` - Your admin password

### **On Railway (Cloud):**

- Server runs `server.js`
- Environment variables store keys
- Logs show all activity
- Automatic restarts on crashes

---

## 📊 Check Server Status

### Quick Health Check:
```bash
curl https://hkarate-license-server-production.up.railway.app/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "licenses": 42
}
```

### View All Licenses:
```bash
curl -H "x-admin-secret: YOUR_SECRET" \
  https://hkarate-license-server-production.up.railway.app/admin/licenses
```

---

## 🆘 Troubleshooting

### **Server not responding?**
1. Check Railway dashboard for errors
2. Check if server is running
3. Check environment variables are set

### **Can't generate licenses?**
1. Make sure you're in the correct directory
2. Check if Node.js is installed: `node --version`
3. Check if keys exist (environment variables on Railway)

### **Admin panel not working?**
1. Check if admin secret is correct
2. Open browser console for errors (F12)
3. Check if server URL is correct in the HTML

### **Need to reset admin secret?**
1. Go to Railway dashboard
2. Open your project
3. Variables tab
4. Change `ADMIN_SECRET` value
5. Server restarts automatically

---

## 📧 Customer License Delivery Process

1. Customer pays for license
2. You generate license using one of the methods above
3. You get a `.json` file with license data
4. Send this file to customer via email
5. Customer downloads it and opens the app
6. App prompts to load license file
7. Customer selects the `.json` file
8. App contacts your server to activate
9. License is now bound to their machine

---

## 🔒 Security Notes

- ✅ **NEVER share your private key**
- ✅ **NEVER commit keys to git**
- ✅ **NEVER share admin secret publicly**
- ✅ **Backup licenses.json regularly**
- ✅ **Keep Railway account secure with 2FA**
- ✅ **Monitor server logs for suspicious activity**

---

## 💡 Quick Access Links

- **Railway Dashboard:** https://railway.app/dashboard
- **Your Server:** https://hkarate-license-server-production.up.railway.app/health
- **Admin Panel (Local):** `file:///c:/Users/hosam/Documents/H Karate/v0.6/admin-panel.html`
- **Admin Panel (Web):** https://h-karate-app.web.app/admin.html
- **License Generator Script:** `v0.6/license-server/generate-license.js`

---

**Last Updated:** September 1, 2026
