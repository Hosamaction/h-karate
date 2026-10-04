# H Karate License Server - Vercel

Free license server for H Karate, deployed on Vercel (no credit card required).

## Setup

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```
   - Sign up with GitHub/GitLab/Email (no credit card needed)

3. **Deploy:**
   ```bash
   vercel
   ```
   - Follow prompts to link project
   - Choose default settings

4. **Set Environment Variables (optional):**
   ```bash
   vercel env add ADMIN_SECRET
   vercel env add PRIVATE_KEY
   vercel env add PUBLIC_KEY
   ```
   - Or use defaults in code

## API Endpoints

Once deployed, your URL will be: `https://your-project.vercel.app`

- `GET /` - Health check
- `GET /license/health` - Health check with license count
- `POST /license/activate` - Activate license on machine
- `POST /license/validate` - Validate license
- `POST /license/issue` - Issue new license (admin)
- `POST /license/revoke` - Revoke license (admin)
- `GET /license/licenses` - List all licenses (admin)

## Admin Authentication

Default admin secret: `hkarate-admin-2026-CHANGE-THIS`

Send in header:
```
x-admin-secret: your-secret-here
```

## Note on Storage

This uses in-memory storage (resets on deploy). For persistent storage, you can:
1. Use Vercel KV (requires Blaze plan)
2. Use external database (MongoDB Atlas free tier, Supabase, etc.)
3. Keep it simple - generate licenses via admin panel as needed

The cryptographic signing ensures licenses can't be forged, so in-memory storage is acceptable for small scale.
