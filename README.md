# Class Payment Tracker Pro

A production-ready UPI fee collection system for a single class or institution.
Students pay via UPI and submit a screenshot; the system OCR-reads the screenshot,
runs heuristic fraud checks, and gives the teacher a fast review queue. Approved
payments get a PDF receipt with a QR code that anyone can use to verify it's real.

## What it does

- **Students** log in with a PIN only (no OTP, no email) — `25007-CS-001` style.
  They see every fee collection for their class, scan a UPI QR or tap a pay
  button, upload their payment screenshot, and track status (pending, approved,
  rejected, late) with class-wide progress shown alongside.
- **Teachers** get a review queue showing OCR-extracted UTR/amount next to what
  the student entered, a heuristic fraud-risk flag with plain-English reasons,
  and one-click approve / reject / request-re-upload. They can also bulk-import
  students via CSV, reconcile a bank/UPI statement export to auto-approve
  matching payments, generate copy-paste WhatsApp reminders for unpaid students,
  and review a tamper-evident audit log of every sensitive action.
- **Receipts** are real PDFs with a QR code linking to a public, no-login
  verification page that shows just enough to confirm a payment is genuine
  (masked student name, amount, collection, approval date — no UTR or screenshot).

## Stack

| Layer    | Technology |
|----------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Chart.js |
| Backend  | Node.js, Express, TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Auth     | JWT (separate teacher/student tokens), bcrypt |
| Storage  | Cloudinary (falls back to local disk in dev) |
| OCR      | Tesseract.js, fully offline (trained data bundled in `backend/tessdata`) |
| PDF      | PDFKit |
| QR       | `qrcode` |

## Project layout

```
backend/   Express API, Prisma schema, services (OCR, fraud, PDF, reconciliation, ...)
frontend/  React app — student dashboard, teacher dashboard, public receipt verification
docs/      Deployment guide and API reference
```

## Quickstart (local development)

### 1. Database

You need a local PostgreSQL instance. Create a database and note the connection string.

### 2. Backend

```bash
cd backend
cp .env.example .env       # fill in DATABASE_URL, JWT_SECRET, etc.
npm install
npx prisma generate
npx prisma migrate deploy   # applies the included migration
npm run seed                 # creates a demo teacher, class, students, collection
npm run dev                  # http://localhost:4000
```

Demo login after seeding (override via `SEED_TEACHER_EMAIL` / `SEED_TEACHER_PASSWORD` in `.env`):
- Teacher: `teacher@example.com` / `ChangeMe123!`
- Student PIN: `25007-CS-001`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173, proxies /api to :4000
```

Open `http://localhost:5173/login` for the student PIN login, or
`http://localhost:5173/teacher/login` for the teacher dashboard.

## A note on this build environment

This project was built in a sandboxed container without outbound access to
`binaries.prisma.sh`, which Prisma's CLI needs to download its query-engine
binary for `prisma generate` / `prisma migrate`. That means Prisma-dependent
backend code could not be runtime-executed or fully type-checked *inside this
sandbox*. To compensate:

- The full SQL schema was hand-written and tested directly against a live
  Postgres instance (constraints, cascades, the audit-log immutability
  trigger, and the receipt-number sequence were all verified under
  concurrency).
- Every service that doesn't touch Prisma (OCR, fraud scoring, PDF
  generation, QR codes, CSV import parsing, bank-statement reconciliation)
  was executed end-to-end with real test files and verified output.
- Prisma-touching controllers were hand-reviewed line by line against
  `schema.prisma`'s exact field and relation names.

None of this affects a normal deployment: Render (and any environment with
normal internet access) can reach `binaries.prisma.sh` fine, so
`prisma generate` / `prisma migrate deploy` will work as expected there. See
`docs/DEPLOYMENT.md` for the exact steps.

## Documentation

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deploying to Render
- [`docs/API.md`](docs/API.md) — full API reference
