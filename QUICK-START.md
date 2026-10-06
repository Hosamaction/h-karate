# H Karate Quick Start Guide

## 🚀 Generate a License (3 Easy Steps)

### Step 1: Open Admin Panel
- Double-click: `v0.6/admin-panel.html`
- Login with: `hkarate-admin-2026-CHANGE-THIS`

### Step 2: Generate License
- **Email:** customer@email.com
- **Plan:** Choose monthly/yearly/lifetime
- **Days Valid:**
  - Monthly: `30`
  - Yearly: `365`
  - Lifetime: `36500`
- Click **"Generate License"**
- Save the `.json` file

### Step 3: Activate in App
- Run H Karate: `cd v0.6` then `npm start`
- Drag license file into the app
- Click **"Activate License"**
- Done! ✅

---

## 🌐 Live URLs

- **Website:** https://h-karate-app.web.app
- **License Server:** https://h-karate-vercel-server.vercel.app
- **Admin Panel:** `v0.6/admin-panel.html` (local file)

---

## 💰 Pricing

- Monthly: **$8.99** (30 days)
- Yearly: **$79.99** (365 days)
- 2-Year: **$109.99** (730 days)
- Lifetime: **$199** (36500 days) - *Admin only, not on website*

---

## 🛠️ Development Commands

```bash
# Run the app in development
cd v0.6
npm start

# Build for production
npm run build

# Deploy website
cd website
firebase deploy

# Deploy license server
# (Auto-deploys on git push to main branch)
```

---

## ❓ Troubleshooting

### License activation fails?
1. Generate a **fresh license** from admin panel
2. Make sure app is running latest code
3. Check console for error messages

### Admin panel won't login?
- Use exact secret: `hkarate-admin-2026-CHANGE-THIS`
- Check browser console for errors
- Make sure internet connection works

### App won't start?
```bash
cd v0.6
npm install
npm start
```

---

## 📞 Quick Links

- [Full Project Status](PROJECT-STATUS.md)
- [License Server Guide](LICENSE-SERVER-ACCESS.md)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Firebase Console](https://console.firebase.google.com/project/h-karate-app)
