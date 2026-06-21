# Deploying to Render

This guide covers deploying the backend (Express API + Postgres) and frontend
(static React app) as two separate Render services.

## 1. Database

1. In the Render dashboard: **New → PostgreSQL**.
2. Note the **Internal Database URL** once it's provisioned — you'll use this
   as `DATABASE_URL` for the backend service (internal URLs are faster and
   free, since both services live in the same Render region).

## 2. Backend (Web Service)

1. **New → Web Service**, connect this repo, set **Root Directory** to `backend`.
2. **Build Command**:
   ```
   npm install && npx prisma generate && npm run build
   ```
3. **Start Command**:
   ```
   npx prisma migrate deploy && node dist/server.js
   ```
   Running `migrate deploy` on every boot is safe — it's a no-op once the
   schema is already up to date, and it means new migrations apply
   automatically on the next deploy.
4. **Environment variables** (see `backend/.env.example` for the full list):

   | Variable | Notes |
   |---|---|
   | `DATABASE_URL` | the Internal Database URL from step 1 |
   | `JWT_SECRET` | generate a long random string |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGINS` | your frontend's URL, e.g. `https://your-app.onrender.com` |
   | `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | from your Cloudinary dashboard — **strongly recommended for production**, since Render's filesystem is ephemeral and local-disk-stored screenshots will be lost on redeploy |
   | `PUBLIC_APP_URL` | your frontend's URL — used to build the QR code link embedded in receipts |
   | `SEED_TEACHER_EMAIL` / `SEED_TEACHER_PASSWORD` / `SEED_TEACHER_NAME` | only used if you run `npm run seed` manually from the Render shell |

5. Deploy. Once live, the schema-engine binary download (the thing blocked in
   the sandbox this was built in) will succeed normally over Render's regular
   internet access, so `prisma generate` and `prisma migrate deploy` both work
   as expected.
6. Optional: open a shell on the service (Render dashboard → Shell) and run
   `npm run seed` once to create a starter teacher account, class, and demo
   collection.

## 3. Frontend (Static Site)

1. **New → Static Site**, connect this repo, set **Root Directory** to `frontend`.
2. **Build Command**: `npm install && npm run build`
3. **Publish Directory**: `dist`
4. **Environment variable**:
   | Variable | Value |
   |---|---|
   | `VITE_API_BASE_URL` | your backend service's URL + `/api`, e.g. `https://class-payment-tracker-api.onrender.com/api` |
5. Add a rewrite rule so client-side routing works on refresh:
   **Redirects/Rewrites** → source `/*`, destination `/index.html`, action `Rewrite`.

## 4. Cloudinary (recommended)

Render's web services use an ephemeral filesystem — anything written to local
disk disappears on every redeploy or restart. The backend automatically falls
back to local-disk storage when Cloudinary isn't configured (handy for local
dev), but for production you should set the three `CLOUDINARY_*` variables so
payment screenshots persist permanently.

Free tier is plenty for a single class: sign up at cloudinary.com, grab your
Cloud Name / API Key / API Secret from the dashboard, and set them as backend
environment variables.

## 5. Post-deploy checklist

- [ ] Visit `https://your-backend.onrender.com/health` — should return `{"status":"ok"}`
- [ ] Log in as the seeded teacher and set your real institution name + UPI ID in **Settings**
- [ ] Create a class, import your real student list via CSV (**Students → Import CSV**)
- [ ] Create your first fee collection
- [ ] Have one student log in with their PIN and submit a test payment to confirm the OCR/upload pipeline works end-to-end on Render
- [ ] Approve it and confirm the receipt PDF + QR verification link work

## Notes on Render's free tier

Free web services on Render spin down after periods of inactivity and take
10–30 seconds to wake back up on the next request — the first payment
submission or login after idle time may feel slow. This is normal and not a
bug in the app. Upgrading to a paid instance removes the spin-down behavior
if that matters for your use case.
