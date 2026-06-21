# API Reference

Base URL: `/api` (e.g. `http://localhost:4000/api` in dev).

Every response is wrapped as:
```json
{ "success": true, "data": { ... }, "message": "optional" }
```
or on error:
```json
{ "success": false, "error": { "message": "...", "code": "...", "details": {} } }
```

Authenticated routes expect `Authorization: Bearer <token>`. Tokens are
issued separately for teachers and students and are not interchangeable.

## Auth

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/teacher/register` | none | `{ name, email, password }` |
| POST | `/auth/teacher/login` | none | `{ email, password }` → `{ token, teacher }` |
| POST | `/auth/student/login` | none | `{ pin }` → `{ token, student }`. PIN-only, no OTP. |

## Settings

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/settings` | teacher | institution name, UPI ID, default amount, theme |
| PUT | `/settings` | teacher | partial update |
| GET | `/settings/upi-qr` | teacher or student | `?amount=&note=` → `{ dataUrl, upiLink }` |

## Classes

| Method | Path | Auth |
|---|---|---|
| GET | `/classes` | teacher |
| POST | `/classes` | teacher |
| PUT | `/classes/:id` | teacher |
| DELETE | `/classes/:id` | teacher |

## Collections (fee collections, e.g. "Lab Fee")

| Method | Path | Auth |
|---|---|---|
| GET | `/collections` | teacher |
| GET | `/collections/:id` | teacher |
| POST | `/collections` | teacher — auto-seeds a `PENDING_PAYMENT` row for every existing student |
| PUT | `/collections/:id` | teacher |
| DELETE | `/collections/:id` | teacher |

## Students

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/students` | teacher | `?search=&classId=&page=&pageSize=` |
| GET | `/students/:id` | teacher | |
| GET | `/students/template` | teacher | downloads CSV import template |
| POST | `/students` | teacher | `{ name, pin, phone?, classId }` |
| PUT | `/students/:id` | teacher | |
| DELETE | `/students/:id` | teacher | |
| POST | `/students/import` | teacher | multipart `file` field, CSV |

## Payments

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/payments/me` | student | own payments across all collections + per-collection class progress |
| POST | `/payments/:collectionId/submit` | student | multipart: `screenshot` file (PNG/JPG) + `utr` field |
| GET | `/payments` | teacher | review queue — `?search=&status=&collectionId=&classId=&sortBy=&sortDir=&page=&pageSize=`. `status=FRAUD_FLAGGED` filters to any non-NONE fraud risk instead of a payment status |
| GET | `/payments/:id` | teacher | full detail incl. OCR, fraud reasons, status history |
| POST | `/payments/:id/approve` | teacher | `{ notes? }` — generates receipt number, only from `PENDING` |
| POST | `/payments/:id/reject` | teacher | `{ notes? }` — only from `PENDING` |
| POST | `/payments/:id/request-reupload` | teacher | `{ notes? }` — only from `PENDING` |
| POST | `/payments/:id/notes` | teacher | `{ notes }` — standalone note update, no status change |

**Payment statuses**: `PENDING_PAYMENT` (not yet paid) → `PENDING` (submitted,
awaiting review) → `APPROVED` / `REJECTED` / `REUPLOAD_REQUESTED`.
`PENDING_PAYMENT` flips to `LATE` automatically once a collection's deadline
passes. Re-submission is allowed from any status except `APPROVED`.

## Receipts

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/receipts/:receiptNumber/download` | teacher (own) or student (own) | streams the PDF |
| GET | `/receipts/:receiptNumber/verify` | none | public — returns masked name, amount, collection, approval date only |

## Reconciliation

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/reconciliation/upload` | teacher | multipart `statement` field — CSV, XLSX, or PDF. Matches by UTR; auto-approves exact amount matches, flags mismatches for manual review |

## Notifications

| Method | Path | Auth |
|---|---|---|
| GET | `/notifications` | student — `?page=&pageSize=&unreadOnly=` |
| POST | `/notifications/:id/read` | student |
| POST | `/notifications/read-all` | student |

## Analytics

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/analytics/overview` | teacher | `?collectionId=` — headline stats + Chart.js-ready `statusDistribution`, `dailyCollectionTrend`, `collectionProgress` |
| GET | `/analytics/collections` | teacher | lightweight paid/total summary per collection |

## Reminders

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/reminders` | teacher | `?collectionId=&status=` — per-student ready-to-copy WhatsApp message |
| GET | `/reminders/bulk` | teacher | one combined group message + pending student names |

## Audit Logs

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/audit-logs` | teacher | `?action=&search=&startDate=&endDate=&page=&pageSize=` — read-only, no mutation endpoints exist |

## Health

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | none — `{ status: "ok", time }` |
