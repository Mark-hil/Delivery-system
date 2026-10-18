# SwiftSend — Frontend (React Web App)

A fully functioning **frontend** for the SwiftSend delivery platform — Customer app, Rider app, and
Admin dashboard, all in one web app. Built with **React + TypeScript + Vite + React Router**.

This README is written for **the backend developer** who needs to know exactly what API this frontend expects. Section 6 is the important one for that, it documents every function in `src/services/mockApi.ts` as if it were an API spec, because that file
**is** the API contract. Every screen calls it exactly the way it would call a real backend; replacing its internals with real HTTP calls (keeping the same function names and return shapes) is the entire integration job.

---

## 1. Requirements

- Node.js 18 or newer
- npm (or yarn/pnpm)
- Any modern browser

## 2. Install & run

```bash
npm install
npm run dev
```

> **If `npm install` fails with an `ERESOLVE` peer-dependency error:** this project ships an `.npmrc`
> with `legacy-peer-deps=true`, which should prevent that. If you still hit it — most commonly because an
> old `node_modules/` or `package-lock.json` from a different project got copied into this folder — delete
> both and reinstall clean:
> ```bash
> rm -rf node_modules package-lock.json   # Windows (PowerShell): rd /s /q node_modules & del package-lock.json
> npm install
> ```
> Or as a one-off: `npm install --legacy-peer-deps`.

This starts Vite's dev server and opens the app at **http://localhost:5173**. That's it — no simulators,
no device pairing, no build toolchain beyond Node.

Other commands:
```bash
npm run build      # production build, output to dist/
npm run preview    # serve the production build locally to sanity-check it
```

## 3. Login & registration — one of each, for every role

There is **one login page** (`/login`) and **one registration page** (`/register`) for the whole app:

- **Login:** enter your email/phone and password. `mockApi.login()` checks it against customer, rider
  and admin accounts and tells the app which role matched. The person never has to say which kind of account they have.
- **Register:** choose **Customer** or **Rider** at the top of the form. Admin accounts are never
  self-registered. They're created from **Admin → Settings → Admin team**. Picking Rider reveals the
  extra fields a rider needs: vehicle type, plate number, and required document uploads.

## 4. Demo accounts

| Role     | Identifier                     | Password     | Notes |
|----------|---------------------------------|--------------|-------|
| Customer | `ama.owusu@email.com`          | `Password1`  | Has wallet balance & order history |
| Rider    | `kwame.mensah@email.com`       | `Password1`  | Documents valid, license expires in ~21 days (triggers the expiry-warning banner) |
| Rider    | `eric.expired@email.com`       | `Password1`  | All documents already expired — logs straight into the forced **Document Validation** page |
| Admin    | `admin@swiftsend.app`          | `Admin123`   | Full access to every admin module |

Password reset and registration document-upload flows show their OTP codes directly in an on-screen toast
(there's no real SMS/email provider in this build).

## 5. Project structure

```
index.html                   Vite entry HTML (Google Fonts loaded here — no native font linking needed)
src/
  main.tsx                    React DOM entry point
  App.tsx                     Providers + full route tree
  styles/global.css           The entire design system: colors, typography, every component's CSS
  routes/guards.tsx           Route guards (RequireCustomer / RequireRider / RequireAdmin / RequireGuest)
  types/index.ts               Shared TypeScript types — the shape of every data model
  utils/                       Validators, formatters, mock-delay helper
  services/
    mockApi.ts                 ★ THE API CONTRACT — see section 6
    storage.ts                  localStorage wrapper (session persistence)
    notifications.ts            Browser Notifications API (document-expiry reminders)
    biometric.ts                WebAuthn platform-authenticator detection (biometric login)
  context/
    AuthContext.tsx              Session for all 3 roles, the unified signIn() dispatcher,
                                  and the rider document-expiry gate
    DeliveryContext.tsx          Customer delivery state machine
    RiderJobContext.tsx          Rider job state machine
    UIContext.tsx                Toast notifications + confirm dialogs (replaces window.alert/confirm)
  components/                  Reusable UI: Button, TextField, OtpInput, DocumentUploadRow,
                                MapBlock (SVG map illustration), FormModal, admin DataTable/KpiCard, etc.
  layouts/                     CustomerLayout & RiderLayout (bottom nav), AdminLayout (sidebar)
  pages/
    auth/                        6 pages — Splash, Onboarding, Login, Register, ForgotPassword, ResetOtp
    customer/                    11 pages
    rider/                       8 pages
    admin/                       7 pages
```

## 6. ★ The API contract (`src/services/mockApi.ts`)

**This is the single most important section for backend integration.** Every function below is called
by the frontend exactly as documented, same inputs, same outputs. Replacing the mock bodies with real
`fetch`/`axios` calls (keeping the signatures identical) means zero changes anywhere else in the app.

All functions are `async` and currently simulate latency with `await mockDelay()`; a real implementation
would `await fetch(...)` instead. All mock data currently lives in in-memory arrays at the top of the
file (`customerDb`, `riderDb`, `adminDb`, etc.) a real backend replaces those with actual persistence.

### 6.1 Authentication

| Function | Input | Returns | Purpose |
|---|---|---|---|
| `login(identifier, password)` | `identifier: string` (email or phone), `password: string` | `{ role: "customer" \| "rider" \| "admin", user: CustomerUser \| RiderUser \| AdminUser }` | **The single login endpoint.** Must check credentials against all three account types and report which one matched. Throws/rejects with a message on failure. |
| `customerRegister(input)` | `{ fullName, phone, email, password }` (all strings) | `CustomerUser` | Creates a customer account and returns it (no password in the response). Throws if the email is taken. |
| `riderRegister(input)` | `{ fullName, phone, email, password, vehicleType, plateNumber, documents: RiderDocument[], facePhotoUri: string }` | `RiderUser` | Creates a rider account with their uploaded documents **and a live-captured selfie** attached. Throws if the email is taken. |
| `riderSubmitDocuments(riderId, documents)` | `riderId: string`, `documents: RiderDocument[]` | `RiderUser` | Re-submits documents after an expiry (or admin-requested re-verification). A real backend should set each required document's new expiry only once it's actually verified — the mock sets it immediately to +365 days for demo purposes. |
| `requestOtp(destination, purpose)` | `destination: string` (email/phone), `purpose: "login" \| "register" \| "resetPassword" \| "riderRegister"` | `string` (the OTP code) | **Note:** in the mock this returns the code directly so the demo is testable without a real SMS/email provider. A real backend must **never** return the code to the client — it should return `void` and actually send it. |
| `verifyOtp(destination, purpose, code)` | same `destination`/`purpose`, plus `code: string` | `boolean` | Whether the code matches. |
| `resetPassword(email, newPassword)` | `email: string`, `newPassword: string` | `void` | Works across all three account types by email — throws if no account matches. |

### 6.2 Customer delivery lifecycle

| Function | Input | Returns | Purpose |
|---|---|---|---|
| `estimateDelivery(input)` | `{ pickupAddress, dropoffAddress, vehicleType }` | `{ distanceKm, etaMinutes, baseFee, distanceFee, serviceFee, totalFee }` | Fare calculation. **The mock reads `baseFee`/`perKmRate`/`serviceFee` from the live `PlatformSettings` object** (see 6.5) — a real backend should do the same from whatever pricing config Admin → Settings writes to. |
| `requestRider(draft)` | A `DeliveryRequest` minus `id`/`status`/`createdAt` (pickup/dropoff/package details + the estimate fields) | `DeliveryRequest` (status `"searching"`) | Creates the delivery request. |
| `matchRider(delivery)` | `DeliveryRequest` | `DeliveryRequest` (status `"accepted"`, with `riderId`/`riderName` set) | Simulates a rider accepting. **In a real backend this should be a websocket/push event**, not a polled call — the frontend currently awaits it directly as a stand-in. |
| `completeDelivery(delivery)` | `DeliveryRequest` | `DeliveryRequest` (status `"delivered"`) | Marks a delivery complete. |
| `submitRating(deliveryId, stars, comment)` | `deliveryId: string`, `stars: number` (1–5), `comment: string` | `void` | Rider rating submission. |
| `fetchCustomerOrders()` | — | `OrderSummary[]` (`{ id, route, status, amount, when }`) | Order history list for the Orders tab. |
| `fetchWalletTxns()` | — | `WalletTxn[]` (`{ id, label, when, amount }`, negative amount = debit) | Wallet transaction history. |

### 6.3 Rider job lifecycle

| Function | Input | Returns | Purpose |
|---|---|---|---|
| `listenForRequest()` | — | `IncomingRequest` (`{ id, pickupAddress, dropoffAddress, packageType, distanceKm, payout, customerName }`) | Simulates a new job arriving. **Should be a push/websocket event in production**, not polled. |
| `acceptRequest(requestId)` | `requestId: string` | `void` | Rider accepts the job. |
| `confirmPickup(requestId)` | `requestId: string` | `void` | Rider confirms they've collected the package. |
| `confirmDeliveryWithOtp(requestId, otp)` | `requestId: string`, `otp: string` | `boolean` | Verifies the receiver's 4-digit proof-of-delivery code. |
| `fetchEarnings()` | — | `EarningsSummary` (`{ today, completedToday, pendingToday, onlineHours, history[] }`) | Rider earnings screen data. |

### 6.4 Admin — Users, Riders, Deliveries, Payments (full CRUD)

Every one of these follows the same `fetch` / `create` / `update` / `delete` shape. All are genuinely
wired into the UI — editing, adding, and deleting in the Admin screens actually mutates this data.

**Users**
- `fetchAdminUsers(): AdminUserRow[]`
- `createAdminUser(input: Omit<AdminUserRow, "id"|"deliveries"|"joined">): AdminUserRow`
- `updateAdminUser(id, patch: Partial<AdminUserRow>): AdminUserRow`
- `toggleAdminUserStatus(id): AdminUserRow` — flips Active ⇄ Suspended
- `deleteAdminUser(id): void`

**Riders** (approval status is tracked separately from the rider's own profile — see `RiderApprovalStatus`)
- `fetchAdminRiders(): AdminRiderRow[]`
- `setRiderApproval(id, status: "Pending"|"Approved"|"Suspended"): AdminRiderRow`
- `updateAdminRider(id, patch: { fullName?, phone?, email?, plateNumber?, vehicleType? }): AdminRiderRow`
- `deleteAdminRider(id): void`
- `adminVerifyRiderDocuments(id): AdminRiderRow` — admin-side equivalent of the rider resubmitting; renews every required document by a year

**Deliveries**
- `fetchAdminDeliveries(): AdminDeliveryRow[]`
- `createAdminDelivery(input: Omit<AdminDeliveryRow, "id">): AdminDeliveryRow`
- `updateAdminDeliveryStatus(id, status: AdminDeliveryStatus): AdminDeliveryRow`
- `reassignAdminDelivery(id, rider: string): AdminDeliveryRow`
- `deleteAdminDelivery(id): void`

**Payments**
- `fetchAdminPayments(): AdminPaymentRow[]`
- `createAdminPayment(input: Omit<AdminPaymentRow, "id">): AdminPaymentRow`
- `updateAdminPaymentStatus(id, status: PaymentStatus): AdminPaymentRow`
- `deleteAdminPayment(id): void`

**Admin team** (this is the *only* way a new admin account is ever created)
- `fetchAdminTeam(): AdminTeamRow[]`
- `inviteAdmin(input: { fullName, email, password }): AdminTeamRow` — throws if the email is taken
- `removeAdmin(id): void`

### 6.5 Admin — platform settings (live-wired, not just stored)

| Function | Input | Returns | Purpose |
|---|---|---|---|
| `getPlatformSettings()` | — | `PlatformSettings` | See the shape below. |
| `updatePlatformSettings(patch)` | `Partial<PlatformSettings>` | `PlatformSettings` | **Important:** `baseFee`/`perKmRate`/`serviceFee` here are read live by `estimateDelivery()` — changing pricing in Admin → Settings changes what the Customer app calculates on its very next request. `promoTitle`/`promoSubtitle`/`promoPercentLabel` are meant to back the Customer Home screen's promo card the same way (currently that card renders static copy in the frontend — wiring it to read from here is a one-line change once a real settings endpoint exists). |

```ts
interface PlatformSettings {
  baseFee: number;
  perKmRate: number;
  serviceFee: number;
  activeRegions: string;
  coverageRadiusKm: number;
  pushEnabled: boolean;
  smsEnabled: boolean;
  maintenanceMode: boolean;
  appVersion: string;
  promoTitle: string;
  promoSubtitle: string;
  promoPercentLabel: string;
}
```

### 6.6 Admin — read-only analytics

- `fetchAdminOverview()` → `{ totalUsers, totalRiders, activeDeliveries, completedToday, revenueToday, dailyDeliveries: number[], locationShare: {label, pct, color}[] }`
- `fetchAdminReports()` → `{ revenueTrend: number[], topRiders: {name, amount}[], topCustomers: {name, deliveries}[] }`

### 6.7 Utility

- `emptyDocumentSet(): RiderDocument[]` — returns the 5 required/optional document slots (ID front, ID back, driving license, insurance, other) with everything unset, used to seed the Register and Document Validation forms.

---

## 7. Core data types (`src/types/index.ts`)

```ts
type UserRole = "customer" | "rider" | "admin";

interface CustomerUser {
  id: string; role: "customer";
  fullName: string; phone: string; email: string;
  avatarInitials: string; walletBalance: number;
}

type DocumentKind = "idFront" | "idBack" | "drivingLicense" | "insurance" | "others";

interface RiderDocument {
  kind: DocumentKind; label: string; required: boolean;
  uri: string | null; uploadedAt: string | null; expiresAt: string | null; // ISO dates
}

interface RiderUser {
  id: string; role: "rider";
  fullName: string; phone: string; email: string;
  vehicleType: "bike" | "car" | "van" | "truck"; plateNumber: string;
  rating: number; trips: number; isOnline: boolean;
  documents: RiderDocument[];
  facePhotoUri: string | null; // live selfie captured at registration, for ID verification
}

interface AdminUser {
  id: string; role: "admin"; fullName: string; email: string;
}

type DeliveryStatus = "pending" | "searching" | "accepted" | "arriving"
  | "pickedUp" | "inTransit" | "delivered" | "cancelled";

interface DeliveryRequest {
  id: string; pickupAddress: string; dropoffAddress: string;
  packageType: string; packageDescription: string; weight: string; instructions: string;
  deliveryType: "immediate" | "scheduled"; vehicleType: "bike" | "car" | "van" | "truck";
  distanceKm: number; etaMinutes: number;
  baseFee: number; distanceFee: number; serviceFee: number; totalFee: number;
  status: DeliveryStatus; riderId?: string; riderName?: string; createdAt: string;
}
```

(Admin-facing row types — `AdminUserRow`, `AdminRiderRow`, `AdminDeliveryRow`, `AdminPaymentRow`,
`AdminTeamRow` — are flatter shapes defined directly in `mockApi.ts` next to the functions that use
them, since they're display/table rows rather than core domain models.)

## 8. State management — what lives where

- **`AuthContext`** holds the current session (`{ role, user }`), persisted to `localStorage`. Exposes
  `signIn(loginResult)` (used by the unified Login page), `signInCustomer`/`signInRider`/`signInAdmin`
  (used after registration), `updateRiderUser` (after document resubmission), `signOut`, and
  `riderNeedsDocumentRevalidation` (computed from the logged-in rider's documents — drives the hard gate
  in `routes/guards.tsx`).
- **`DeliveryContext`** holds the in-progress delivery request draft, the live estimate, and the current
  `DeliveryRequest` as it moves through status transitions — scoped to the customer's active delivery flow.
- **`RiderJobContext`** holds online/offline state, the incoming job request, and the active job as it
  moves through pickup → delivery → proof-of-delivery.
- **`UIContext`** is a small toast/confirm-dialog system — the web equivalent of React Native's
  `Alert.alert`, since the browser has no native equivalent worth using for a polished UI.

None of this is persisted beyond `localStorage`'s session record — reloading the page keeps you logged
in, but all mock data (users, deliveries, admin records) resets, since it lives in memory inside
`mockApi.ts`. A real backend removes that limitation entirely.

## 9. Routing map

| Path | Page | Guard |
|---|---|---|
| `/` | Redirects to the right place based on session | — |
| `/splash`, `/onboarding`, `/login`, `/register`, `/forgot-password`, `/reset-otp` | Shared auth flow | `RequireGuest` (redirects away if already logged in) |
| `/customer/home`, `/orders`, `/wallet`, `/profile` | Customer tabs (bottom nav) | `RequireCustomer` |
| `/customer/request`, `/estimate`, `/searching`, `/rider-found`, `/tracking`, `/completed`, `/rate` | Customer delivery flow (no bottom nav) | `RequireCustomer` |
| `/rider/dashboard`, `/earnings`, `/profile` | Rider tabs (bottom nav) | `RequireRider` (also gates to Document Validation if expired) |
| `/rider/request-popup`, `/pickup`, `/delivery`, `/proof-of-delivery` | Rider job flow (no bottom nav) | `RequireRider` |
| `/admin/dashboard`, `/users`, `/riders`, `/deliveries`, `/payments`, `/reports`, `/settings` | Admin modules (sidebar) | `RequireAdmin` |

## 10. What's implemented, feature by feature

**Customer App:** Splash → Onboarding → Login → Register → Home → Request Delivery → Price Estimate
(live-priced from Admin settings) → Searching Rider → Rider Found → Live Tracking → Delivery Completed →
Rate Rider → Orders → Wallet → Profile.

**Rider App:** Login → Register (with a **live selfie capture** for identity verification, plus required
ID front/back, driving license, insurance uploads, and an optional "other document") → Dashboard
(earnings, online toggle, expiring-document banner) → incoming Request Popup → Pickup → Delivery in
progress → Proof of Delivery (OTP) → Earnings → Profile.

**Document expiry handling:** every rider document carries an expiry date. On login, the app schedules
browser notifications at 14/7/1 days before expiry and immediately for anything already expired
(permission-gated — see §11). **A rider with an expired required document is blocked from the dashboard
entirely** and routed to Document Validation to re-upload before continuing.

**Admin Dashboard:** Dashboard, Users, Riders, Deliveries, Payments, Reports, Settings — everything
editable: add/edit/suspend/delete users, edit/approve/suspend/re-verify-documents/delete riders,
create/edit/delete deliveries and payments, and a Settings page covering pricing, service areas, the
promo banner, notification toggles, maintenance mode, and admin team management.

## 11. Browser API notes (what's real vs. simulated)

- **Notifications:** uses the real `Notification` Web API, gated behind the browser's permission prompt.
  Scheduled (non-immediate) reminders use `setTimeout`, so they only fire while the tab stays open — a
  production deployment should move scheduling server-side and deliver these as real web push
  notifications instead.
- **Biometric login:** uses the real `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()`
  check and triggers the browser's actual Touch ID / Windows Hello / Android fingerprint prompt via
  WebAuthn. It's honest about its limit, though: without a backend issuing a signed challenge, WebAuthn
  can't authenticate a *specific* account from the frontend alone — see the comment in
  `src/services/biometric.ts` for the full explanation. On success it currently re-submits whatever
  credentials are typed into the login form, same as a real "unlock my saved password" pattern.
- **Document uploads:** plain `<input type="file" accept="image/*" capture="environment">` — opens the
  OS's native camera/gallery picker on mobile browsers, a file dialog on desktop.
- **Face capture (rider registration):** uses the real `navigator.mediaDevices.getUserMedia()` API to
  open a live front-facing camera feed in the browser, captures a square-cropped still frame to a canvas,
  and encodes it as a JPEG data URL (`src/components/FaceCapture.tsx`). This is a genuine live capture —
  not a file picker — so it can't be satisfied with an old photo from the gallery. If the browser/device
  has no camera or the person denies permission, it falls back to a plain file upload rather than
  blocking registration entirely. A production backend should run real face-match/liveness verification
  against the ID photo server-side; this frontend only captures and stores the image.
- **Maps:** stylized SVG illustrations, not a real maps SDK. Swapping in Google Maps/Mapbox is a
  component-level change isolated to `src/components/MapBlock.tsx`.

## 12. Known limitations (frontend-only build)

- Data resets on page reload — everything lives in memory inside `mockApi.ts`. Only the session
  (`localStorage`) survives a reload.
- OTP codes are shown directly in a toast for testing, since there's no real SMS/email provider.
- `matchRider()` and `listenForRequest()` are called directly by the frontend and awaited — a real
  backend should push these events (websocket or similar) instead of the frontend polling for them.
- See §11 above for what's simulated vs. real at the browser-API layer.
