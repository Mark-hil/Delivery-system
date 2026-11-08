# SwiftSend Enterprise Backend (`swiftsend-backend`)

Enterprise-grade **NestJS 11 + TypeScript + Prisma 7 (PostgreSQL) + Redis + Socket.IO** backend powering the SwiftSend Customer, Rider, and Admin portals.

---

## 1. Architecture Overview

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **API Framework** | NestJS 11 (`@nestjs/platform-express`) | Modular REST API (`/api/*`), DTO validation, Guards, Helmet CSP |
| **Database & ORM** | PostgreSQL 16 + Prisma 7 (`@prisma/adapter-pg`) | Relational persistence, ACID transactions, Row-Level Security (RLS) |
| **Cache & Locks** | Redis 7 (`ioredis`) | OTP storage, brute-force attempt counters, live rider geolocation, settings cache |
| **Real-Time Dispatch** | Socket.IO (`/dispatch` namespace) | Live job broadcasting, rider GPS streaming, delivery status rooms |
| **Payments** | Paystack API + Webhooks | Wallet top-ups, delivery checkout, HMAC-SHA512 webhook settlement |
| **SMS Gateway** | Arkesel SMS API v2 | Authentication OTPs, delivery receiver alerts, rider assignment alerts |
| **Cloud Storage** | AWS S3 / Cloudflare R2 (`@aws-sdk/client-s3`) | Owner-scoped pre-signed upload URLs for KYC documents & live selfies |

---

## 2. Security Architecture & Controls

### 2.1 Keys on the Server Only
- **Strict Server Isolation:** All cryptographic secrets and third-party API keys (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`, `ARKESEL_API_KEY`, `AWS_SECRET_ACCESS_KEY`, `DATABASE_URL`) reside exclusively in `swiftsend-backend/.env` and are never exposed to the client.
- **No Hardcoded Fallbacks:** Services read configuration strictly from `.env` via `ConfigService`. Startup fails fast if `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` is missing, or if `NODE_ENV=production` is started without a live `PAYSTACK_SECRET_KEY`.
- **Clean Frontend Bundle:** `swiftsend-frontend/.env` contains only public API/WebSocket base URLs (`VITE_API_BASE_URL`, `VITE_WS_URL`). No plaintext passwords or API keys exist in the frontend code.

### 2.2 PostgreSQL Row-Level Security (RLS)
- **Database-Level Isolation:** Migration [`20261108135000_enable_row_level_security`](prisma/migrations/20261108135000_enable_row_level_security/migration.sql) enables and forces Row-Level Security (`ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`) on all 12 database tables:
  - `User`, `RefreshToken`, `CustomerProfile`, `RiderProfile`, `AdminProfile`, `RiderDocument`, `Delivery`, `Payment`, `PaymentWebhookEvent`, `WalletTxn`, `RiderEarning`, `PlatformSettings`.
- **Session Context Binding:** [`PrismaService.withRlsContext`](src/database/prisma.service.ts) scopes database transactions to the authenticated actor by setting `app.current_user_id` and `app.current_user_role` locally (`set_config(..., true)`).

### 2.3 Record Ownership Checks (BOLA / IDOR Protection)
Every endpoint verifies that the authenticated user owns the target resource before reading or mutating it:
- **Deliveries (`DeliveriesService`):**
  - `GET /api/deliveries/:id`: Customers may only view deliveries where `delivery.customer.userId === user.userId`. Riders may only view deliveries assigned to their `rider.id` (`delivery.rider.userId === user.userId`).
  - `POST /api/deliveries/:id/rate`: Restricted to the owning customer after status reaches `delivered`.
  - **Delivery OTP Redaction:** The 4-digit `deliveryOtp` is returned only to the owning customer (`role === "customer"`) and `admin`. It is stripped from all rider REST responses and WebSocket broadcasts (`job:available`) so riders must obtain the OTP from the physical recipient upon drop-off.
- **Rider Operations (`RiderService`):**
  - `POST /api/rider/jobs/:id/accept`: Requires `rider.approvalStatus === "Approved"` and all required `RiderDocument` records to have `isVerified === true` and non-expired `expiresAt`. Uses atomic conditional `updateMany({ where: { id, status: "searching", riderId: null } })` to prevent double-claiming.
  - `POST /api/rider/jobs/:id/pickup` & `POST /api/rider/jobs/:id/complete`: Verifies `delivery.riderId === rider.id` (`403 Forbidden` otherwise) and uses atomic status transitions.
- **Payments (`PaymentsService`):**
  - `POST /api/payments/delivery/initialize`: Verifies `delivery.customerId === customer.id`.
  - `GET /api/payments/verify/:reference`: Verifies the payment record belongs to `currentUser.userId` (or `role === "admin"`).
  - **Wallet Over-Commit Protection:** `DeliveriesService.create` subtracts the sum of active in-progress deliveries (`searching`, `accepted`, `arriving`, `pickedUp`, `inTransit`) from `customer.walletBalance` before allowing a new order.
- **Uploads (`UploadsController` & `UploadsService`):**
  - `POST /api/uploads/presigned-url`: Requires `JwtAuthGuard`, restricts MIME types to `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`, and prefixes every storage key with `${user.userId}/`.
- **WebSockets (`DispatchGateway`):**
  - `rider:update_location`: Verifies `delivery.riderId === riderId` before emitting `rider:location_changed` to `delivery:<id>`.

### 2.4 Admin Behind Login & RBAC
- **Backend Guards:** All `/api/admin/*` routes in [`AdminController`](src/modules/admin/admin.controller.ts) and [`SettingsController.updateSettings`](src/modules/settings/settings.controller.ts) are protected by `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles("admin")`.
- **Live Account Validation (`JwtStrategy`):** On every request, [`JwtStrategy.validate`](src/modules/auth/strategies/jwt.strategy.ts) rejects tokens with `typ === "refresh"`, queries the database to verify the user still exists and `status !== "Suspended"`, and loads the authoritative `user.role` from PostgreSQL.
- **Admin Safety Checks (`AdminService`):**
  - Strips `passwordHash` from all admin queries via `SAFE_USER_SELECT`.
  - Prevents admins from suspending, deleting, or revoking their own account or removing the last remaining admin.
  - Immediately deletes all `RefreshToken` rows when a user is suspended.
- **Frontend Guard (`RequireAdmin`):** Requires both `session.role === "admin"` and an active JWT access token (`hasActiveAuthToken()`), redirecting unauthenticated visitors to `/login`.

### 2.5 Rate-Limited Signup & Authentication
- **Endpoint Throttling (`AuthController`):**
  - `POST /api/auth/customer/register`: **5 requests / minute** (`@Throttle({ default: { limit: 5, ttl: 60000 } })`)
  - `POST /api/auth/rider/register`: **5 requests / minute** (Riders are created with `approvalStatus: "Pending"` and `isVerified: false` until verified by an admin)
  - `POST /api/auth/login`: **10 requests / minute**
  - `POST /api/auth/otp/request`: **3 requests / minute**
  - `POST /api/auth/otp/verify`: **5 requests / minute** + Redis per-destination lockout after 5 failed attempts
  - `POST /api/auth/password-reset`: **5 requests / minute**
  - `POST /api/auth/refresh`: **10 requests / minute**
- **Delivery OTP Brute-Force Lockout:** `RiderService.completeDelivery` tracks failed completion OTP attempts in Redis (`delivery:otp:attempts:<deliveryId>`) and blocks further attempts after 5 failures.
- **No Public Admin Signup:** Public registration only permits `customer` and `rider` accounts.

### 2.6 Webhooks Verification & Idempotency
- **Raw Payload Requirement:** [`PaymentsController.handlePaystackWebhook`](src/modules/payments/payments.controller.ts) passes the exact unparsed `req.rawBody` buffer (enabled via `NestFactory.create(AppModule, { rawBody: true })`) to `PaymentsService.processWebhook`. Requests missing `x-paystack-signature` or `rawBody` are rejected with `401 Unauthorized`.
- **Constant-Time HMAC-SHA512 Verification:** [`PaymentsService.processWebhook`](src/modules/payments/payments.service.ts) computes `HMAC-SHA512(rawBody, PAYSTACK_WEBHOOK_SECRET)` and compares digests using `crypto.timingSafeEqual`.
- **Idempotent Settlement:** Duplicate webhook deliveries are filtered via the unique `reference` constraint on `PaymentWebhookEvent`, and wallet credits use atomic conditional updates (`updateMany({ where: { id, status: { not: PaymentStatus.Paid } } })`) with `{ increment: paidAmount }`.

---

## 3. Environment Variables (`.env`)

Copy `.env.example` to `.env` in both `swiftsend-backend` and `swiftsend-frontend`:

### Backend (`swiftsend-backend/.env`)

| Variable | Description | Example (Dev) |
| :--- | :--- | :--- |
| `PORT` | HTTP server port | `4000` |
| `NODE_ENV` | Runtime environment (`development` \| `production`) | `development` |
| `BACKEND_URL` | Public URL of the backend server | `http://localhost:4000` |
| `FRONTEND_URL` | Trusted frontend origin for CORS & callback validation | `http://localhost:5173` |
| `POSTGRES_USER` | PostgreSQL user (used by `docker-compose.yml`) | `swiftsend` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `swiftsend_secret_password` |
| `POSTGRES_DB` | PostgreSQL database name | `swiftsend_db` |
| `POSTGRES_PORT` | Host port bound to `127.0.0.1` for PostgreSQL | `5432` |
| `DATABASE_URL` | Prisma PostgreSQL connection string | `postgresql://swiftsend:...@localhost:5432/swiftsend_db?schema=public` |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Optional Redis password | *(empty in local dev)* |
| `JWT_ACCESS_SECRET` | 32+ byte secret for signing access JWTs (Required) | *(64-char hex string)* |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | `1h` |
| `JWT_REFRESH_SECRET` | 32+ byte secret for signing refresh JWTs (Required) | *(64-char hex string)* |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `30d` |
| `AWS_S3_BUCKET` | S3 / R2 bucket name for KYC uploads | *(optional in dev)* |
| `AWS_REGION` | S3 region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | S3 access key ID | *(optional in dev)* |
| `AWS_SECRET_ACCESS_KEY` | S3 secret access key | *(optional in dev)* |
| `UPLOAD_URL_EXPIRES_SECONDS` | Pre-signed upload URL expiration in seconds | `300` |
| `ARKESEL_API_KEY` | Arkesel SMS API v2 key | `arkesel_test_key` |
| `ARKESEL_SENDER_ID` | SMS sender ID (max 11 chars) | `SwiftSend` |
| `ARKESEL_SMS_URL` | Arkesel SMS endpoint | `https://sms.arkesel.com/api/v2/sms/send` |
| `ARKESEL_SANDBOX` | Simulate SMS in logs (`true` \| `false`) | `true` |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | `sk_test_...` |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key | `pk_test_...` |
| `PAYSTACK_WEBHOOK_SECRET` | Secret used to verify `x-paystack-signature` | `sk_test_...` |
| `PAYSTACK_BASE_URL` | Paystack API base URL | `https://api.paystack.co` |
| `PAYSTACK_CALLBACK_URL` | Default post-checkout redirect URL | `http://localhost:5173/customer/wallet` |
| `PAYSTACK_MOCK` | Enable mock Paystack checkout in non-production (`true` \| `false`) | `true` |
| `SEED_DEFAULT_PASSWORD` | Default customer/rider password used by `prisma/seed.ts` | `Password1` |
| `SEED_ADMIN_EMAIL` | Default admin email used by `prisma/seed.ts` | `admin@swiftsend.app` |
| `SEED_ADMIN_PASSWORD` | Default admin password used by `prisma/seed.ts` | `Admin123` |

### Frontend (`swiftsend-frontend/.env`)

| Variable | Description | Example (Dev) |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Backend REST API base URL | `http://localhost:4000/api` |
| `VITE_WS_URL` | Backend Socket.IO dispatch namespace URL | `http://localhost:4000/dispatch` |

---

## 4. Setup, Database Migration & Verification

### 4.1 Install Dependencies & Generate Prisma Client
```bash
cd swiftsend-backend
npm install
./node_modules/.bin/prisma generate --config prisma7.config.ts
```

### 4.2 Start PostgreSQL & Redis + Apply Migrations & Seed
```bash
docker compose up -d
./node_modules/.bin/prisma migrate deploy --config prisma7.config.ts
npx tsx prisma/seed.ts
```

### 4.3 Run Unit & Security Test Suites
```bash
# Type-check and run all Vitest unit & security specs (24 tests across 4 suites)
./node_modules/.bin/tsc --noEmit && npm test
```

### 4.4 Run Live End-to-End Verification Scripts
With the backend running (`npm run start:dev`):
```bash
node test-remediation.mjs   # Auth, BOLA/IDOR, OTP redaction, pricing & wallet integrity
node test-admin-e2e.mjs     # Admin RBAC, KYC verification, delivery & payment overrides
node test-websocket.mjs     # Real-time Socket.IO dispatch & GPS streaming
```
