import { mockDelay } from "@/utils/mockDelay";
import {
  AdminUser,
  CustomerUser,
  DeliveryRequest,
  DocumentKind,
  OtpChallenge,
  RiderDocument,
  RiderUser,
} from "@/types";
import { initialsOf } from "@/utils/formatters";

/**
 * This file stands in for a real backend. Every exported function returns a Promise
 * with the shape a real REST/GraphQL call would — so swapping mockApi for a real
 * api client later means changing this file only, not the screens that call it.
 */

// ---------------------------------------------------------------------------
// In-memory "database" (resets on app reload — that's expected for a frontend-only build)
// ---------------------------------------------------------------------------

let customerDb: (CustomerUser & { password: string })[] = [
  {
    id: "cust-1",
    role: "customer",
    fullName: "Ama Owusu",
    phone: "0248125567",
    email: "ama.owusu@email.com",
    password: "Password1",
    avatarInitials: "AO",
    walletBalance: 214.3,
  },
];

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

function freshDocumentSet(opts?: { expired?: boolean }): RiderDocument[] {
  const idExpiry = opts?.expired ? futureDate(-2) : futureDate(400);
  const licenseExpiry = opts?.expired ? futureDate(-2) : futureDate(21); // intentionally close-to-expiry by default for demo
  const insuranceExpiry = opts?.expired ? futureDate(-2) : futureDate(180);
  return [
    { kind: "idFront", label: "National ID (front)", required: true, uri: "mock://id-front.jpg", uploadedAt: futureDate(-30), expiresAt: idExpiry },
    { kind: "idBack", label: "National ID (back)", required: true, uri: "mock://id-back.jpg", uploadedAt: futureDate(-30), expiresAt: idExpiry },
    { kind: "drivingLicense", label: "Driving license", required: true, uri: "mock://license.jpg", uploadedAt: futureDate(-30), expiresAt: licenseExpiry },
    { kind: "insurance", label: "Vehicle insurance", required: true, uri: "mock://insurance.jpg", uploadedAt: futureDate(-30), expiresAt: insuranceExpiry },
    { kind: "others", label: "Other supporting document", required: false, uri: null, uploadedAt: null, expiresAt: null },
  ];
}

let riderDb: (RiderUser & { password: string })[] = [
  {
    id: "rider-1",
    role: "rider",
    fullName: "Kwame Mensah",
    phone: "0204451198",
    email: "kwame.mensah@email.com",
    password: "Password1",
    vehicleType: "bike",
    plateNumber: "GT 4471-22",
    rating: 4.9,
    trips: 312,
    isOnline: true,
    documents: freshDocumentSet(), // license expires in 21 days by default — good for demoing the expiry-warning banner
    facePhotoUri: "mock://face-kwame.jpg",
  },
  {
    id: "rider-2",
    role: "rider",
    fullName: "Expired Eric",
    phone: "0551112222",
    email: "eric.expired@email.com",
    password: "Password1",
    vehicleType: "car",
    plateNumber: "GT 9090-20",
    rating: 4.6,
    trips: 140,
    isOnline: false,
    documents: freshDocumentSet({ expired: true }), // use this account to demo the forced document-revalidation flow
    facePhotoUri: "mock://face-eric.jpg",
  },
];

let adminDb: (AdminUser & { password: string })[] = [
  {
    id: "admin-1",
    role: "admin",
    fullName: "Nana Adjei",
    email: "admin@swiftsend.app",
    password: "Admin123",
  },
];

let otpStore: OtpChallenge[] = [];

// ---------------------------------------------------------------------------
// Platform settings — a single mutable source of truth that the Admin Settings
// screen edits and that the rest of the app (fare calculation, home promo banner)
// actually reads from. This is what makes "admin can edit everything" real rather
// than cosmetic: changing a value here changes behaviour everywhere else.
// ---------------------------------------------------------------------------

export interface PlatformSettings {
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

let platformSettings: PlatformSettings = {
  baseFee: 14,
  perKmRate: 3.5,
  serviceFee: 5,
  activeRegions: "Greater Accra, Kumasi",
  coverageRadiusKm: 35,
  pushEnabled: true,
  smsEnabled: true,
  maintenanceMode: false,
  appVersion: "1.0.0",
  promoTitle: "Your first delivery's on us",
  promoSubtitle: "Any drop-off under 5km, just this week",
  promoPercentLabel: "–100%",
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  await mockDelay(200);
  return { ...platformSettings };
}

export async function updatePlatformSettings(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
  await mockDelay(500);
  platformSettings = { ...platformSettings, ...patch };
  return { ...platformSettings };
}

// ---------------------------------------------------------------------------
// Auth — unified login
// ---------------------------------------------------------------------------

export type LoginResult =
  | { role: "customer"; user: CustomerUser }
  | { role: "rider"; user: RiderUser }
  | { role: "admin"; user: AdminUser };

/**
 * The single entry point every login screen uses. It checks the credentials
 * against all three account types and returns whichever one matches — the
 * person never has to tell the app whether they're a customer, rider, or admin.
 */
export async function login(identifier: string, password: string): Promise<LoginResult> {
  await mockDelay();

  const customerMatch = customerDb.find(
    (u) => (u.email === identifier || u.phone === identifier) && u.password === password
  );
  if (customerMatch) {
    const { password: _pw, ...user } = customerMatch;
    return { role: "customer", user };
  }

  const riderMatch = riderDb.find(
    (u) => (u.email === identifier || u.phone === identifier) && u.password === password
  );
  if (riderMatch) {
    const { password: _pw, ...user } = riderMatch;
    return { role: "rider", user };
  }

  const adminMatch = adminDb.find((u) => u.email === identifier && u.password === password);
  if (adminMatch) {
    const { password: _pw, ...user } = adminMatch;
    return { role: "admin", user };
  }

  throw new Error("Incorrect email/phone or password.");
}

// ---------------------------------------------------------------------------
// Registration — Customer
// ---------------------------------------------------------------------------

export async function customerRegister(input: {
  fullName: string;
  phone: string;
  email: string;
  password: string;
}): Promise<CustomerUser> {
  await mockDelay();
  if (customerDb.some((u) => u.email === input.email)) {
    throw new Error("An account with this email already exists.");
  }
  const newUser: CustomerUser & { password: string } = {
    id: `cust-${customerDb.length + 1}`,
    role: "customer",
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
    password: input.password,
    avatarInitials: initialsOf(input.fullName),
    walletBalance: 0,
  };
  customerDb.push(newUser);
  const { password: _pw, ...user } = newUser;
  return user;
}

// ---------------------------------------------------------------------------
// Registration — Rider
// ---------------------------------------------------------------------------

export async function riderRegister(input: {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  vehicleType: RiderUser["vehicleType"];
  plateNumber: string;
  documents: RiderDocument[];
  facePhotoUri: string;
}): Promise<RiderUser> {
  await mockDelay(1000);
  if (riderDb.some((u) => u.email === input.email)) {
    throw new Error("An account with this email already exists.");
  }
  const newUser: RiderUser & { password: string } = {
    id: `rider-${riderDb.length + 1}`,
    role: "rider",
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
    password: input.password,
    vehicleType: input.vehicleType,
    plateNumber: input.plateNumber,
    rating: 0,
    trips: 0,
    isOnline: false,
    documents: input.documents,
    facePhotoUri: input.facePhotoUri,
  };
  riderDb.push(newUser);
  const { password: _pw, ...user } = newUser;
  return user;
}

export async function riderSubmitDocuments(
  riderId: string,
  documents: RiderDocument[]
): Promise<RiderUser> {
  await mockDelay(900);
  const idx = riderDb.findIndex((u) => u.id === riderId);
  if (idx === -1) throw new Error("Rider not found.");
  // Re-validating pushes every required doc's expiry a year out, as a real verification would.
  const renewed = documents.map((d) =>
    d.required ? { ...d, expiresAt: futureDate(365), uploadedAt: new Date().toISOString() } : d
  );
  riderDb[idx] = { ...riderDb[idx], documents: renewed };
  const { password: _pw, ...user } = riderDb[idx];
  return user;
}

// ---------------------------------------------------------------------------
// OTP (used for rider/customer registration verification AND password reset)
// ---------------------------------------------------------------------------

export async function requestOtp(destination: string, purpose: OtpChallenge["purpose"]): Promise<string> {
  await mockDelay(500);
  // A real backend never returns the code — it texts/emails it. We return it here only
  // so the demo can display it on-screen via a toast, keeping the flow testable offline.
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore = otpStore.filter((o) => !(o.destination === destination && o.purpose === purpose));
  otpStore.push({ destination, purpose, code });
  return code;
}

export async function verifyOtp(
  destination: string,
  purpose: OtpChallenge["purpose"],
  code: string
): Promise<boolean> {
  await mockDelay(500);
  const match = otpStore.find(
    (o) => o.destination === destination && o.purpose === purpose && o.code === code
  );
  return Boolean(match);
}

/** Works for any account type, since Login is unified and a person may not
 * remember whether they registered as a customer or a rider. */
export async function resetPassword(email: string, newPassword: string): Promise<void> {
  await mockDelay(600);
  const customerIdx = customerDb.findIndex((u) => u.email === email);
  if (customerIdx !== -1) {
    customerDb[customerIdx].password = newPassword;
    return;
  }
  const riderIdx = riderDb.findIndex((u) => u.email === email);
  if (riderIdx !== -1) {
    riderDb[riderIdx].password = newPassword;
    return;
  }
  const adminIdx = adminDb.findIndex((u) => u.email === email);
  if (adminIdx !== -1) {
    adminDb[adminIdx].password = newPassword;
    return;
  }
  throw new Error("No account found for this email.");
}

// ---------------------------------------------------------------------------
// Delivery lifecycle (customer side)
// ---------------------------------------------------------------------------

export async function estimateDelivery(input: {
  pickupAddress: string;
  dropoffAddress: string;
  vehicleType: DeliveryRequest["vehicleType"];
}): Promise<Pick<DeliveryRequest, "distanceKm" | "etaMinutes" | "baseFee" | "distanceFee" | "serviceFee" | "totalFee">> {
  await mockDelay(600);
  const distanceKm = 6 + Math.round(Math.random() * 6 * 10) / 10;
  const etaMinutes = Math.round(distanceKm * 3 + 5);
  // Pulls live from admin-edited platform settings — change the rates in
  // Admin → Settings and every new estimate reflects it immediately.
  const baseFee = platformSettings.baseFee;
  const distanceFee = Math.round(distanceKm * platformSettings.perKmRate * 100) / 100;
  const serviceFee = platformSettings.serviceFee;
  const totalFee = Math.round((baseFee + distanceFee + serviceFee) * 100) / 100;
  return { distanceKm, etaMinutes, baseFee, distanceFee, serviceFee, totalFee };
}

export async function requestRider(
  draft: Omit<DeliveryRequest, "id" | "status" | "createdAt">
): Promise<DeliveryRequest> {
  await mockDelay(400);
  const delivery: DeliveryRequest = {
    ...draft,
    id: `SS-${20100 + Math.floor(Math.random() * 900)}`,
    status: "searching",
    createdAt: new Date().toISOString(),
  };
  return delivery;
}

export async function matchRider(delivery: DeliveryRequest): Promise<DeliveryRequest> {
  // Simulates the searching → matched transition. Real app: this resolves via a websocket event.
  await mockDelay(2200);
  return { ...delivery, status: "accepted", riderId: "rider-1", riderName: "Kwame Mensah" };
}

export async function completeDelivery(delivery: DeliveryRequest): Promise<DeliveryRequest> {
  await mockDelay(500);
  return { ...delivery, status: "delivered" };
}

export async function submitRating(deliveryId: string, stars: number, comment: string): Promise<void> {
  await mockDelay(500);
  // no-op in the mock — would POST /deliveries/:id/rating
}

export interface OrderSummary {
  id: string;
  route: string;
  status: DeliveryStatusLabel;
  amount: number;
  when: string;
}
type DeliveryStatusLabel = "In transit" | "Arriving" | "Pending" | "Delivered" | "Cancelled";

export async function fetchCustomerOrders(): Promise<OrderSummary[]> {
  await mockDelay(500);
  return [
    { id: "SS-20117", route: "Osu → East Legon", status: "In transit", amount: 46.5, when: new Date().toISOString() },
    { id: "SS-20116", route: "Kaneshie → Adenta", status: "Arriving", amount: 35.5, when: new Date().toISOString() },
    { id: "SS-20115", route: "Dansoman → Airport Res.", status: "Pending", amount: 27, when: new Date().toISOString() },
  ];
}

export interface WalletTxn {
  id: string;
  label: string;
  when: string;
  amount: number; // negative = debit
}

export async function fetchWalletTxns(): Promise<WalletTxn[]> {
  await mockDelay(400);
  return [
    { id: "t1", label: "Delivery payment", when: new Date().toISOString(), amount: -46.5 },
    { id: "t2", label: "Mobile Money top-up", when: new Date().toISOString(), amount: 150 },
    { id: "t3", label: "Delivery payment", when: new Date().toISOString(), amount: -27 },
  ];
}

// ---------------------------------------------------------------------------
// Rider job lifecycle
// ---------------------------------------------------------------------------

export interface IncomingRequest {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  packageType: string;
  distanceKm: number;
  payout: number;
  customerName: string;
}

export async function listenForRequest(): Promise<IncomingRequest> {
  await mockDelay(1800);
  return {
    id: `SS-${20100 + Math.floor(Math.random() * 900)}`,
    pickupAddress: "Kaneshie Market",
    dropoffAddress: "Spintex Road, Accra",
    packageType: "Documents",
    distanceKm: 6.2,
    payout: 35.5,
    customerName: "Efua Boateng",
  };
}

export async function acceptRequest(requestId: string): Promise<void> {
  await mockDelay(400);
}

export async function confirmPickup(requestId: string): Promise<void> {
  await mockDelay(500);
}

export async function confirmDeliveryWithOtp(requestId: string, otp: string): Promise<boolean> {
  await mockDelay(600);
  return otp.length === 4; // mock acceptance criteria
}

export interface EarningsSummary {
  today: number;
  completedToday: number;
  pendingToday: number;
  onlineHours: number;
  history: { id: string; label: string; when: string; amount: number }[];
}

export async function fetchEarnings(): Promise<EarningsSummary> {
  await mockDelay(500);
  return {
    today: 312.8,
    completedToday: 11,
    pendingToday: 3,
    onlineHours: 7.4,
    history: [
      { id: "e1", label: "Kaneshie → Adenta", when: new Date().toISOString(), amount: 35.5 },
      { id: "e2", label: "Osu → East Legon", when: new Date().toISOString(), amount: 46.5 },
    ],
  };
}

// ---------------------------------------------------------------------------
// Admin data
// ---------------------------------------------------------------------------

export async function fetchAdminOverview() {
  await mockDelay(600);
  return {
    totalUsers: 42180,
    totalRiders: 3640,
    activeDeliveries: 228,
    completedToday: 1904,
    revenueToday: 89400,
    dailyDeliveries: [40, 55, 48, 70, 60, 85, 95],
    locationShare: [
      { label: "East Legon", pct: 40, color: "#16A34A" },
      { label: "Adenta", pct: 25, color: "#F5B700" },
      { label: "Dansoman", pct: 20, color: "#2563EB" },
      { label: "Other", pct: 15, color: "#9CA3AF" },
    ],
  };
}

export interface AdminUserRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  deliveries: number;
  joined: string;
  status: "Active" | "Suspended";
}

let adminUsersDb: AdminUserRow[] = [
  { id: "u1", name: "Ama Owusu", phone: "+233 24 812 5567", email: "ama.owusu@email.com", deliveries: 28, joined: "Jan 2025", status: "Active" },
  { id: "u2", name: "Kofi Asante", phone: "+233 20 118 4423", email: "kofi.asante@email.com", deliveries: 14, joined: "Mar 2025", status: "Active" },
  { id: "u3", name: "Efua Boateng", phone: "+233 26 774 9931", email: "efua.boateng@email.com", deliveries: 3, joined: "Jul 2025", status: "Suspended" },
];

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  await mockDelay(500);
  return [...adminUsersDb];
}

export async function createAdminUser(input: Omit<AdminUserRow, "id" | "deliveries" | "joined">): Promise<AdminUserRow> {
  await mockDelay(500);
  const row: AdminUserRow = {
    ...input,
    id: `u${adminUsersDb.length + 1}`,
    deliveries: 0,
    joined: new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
  };
  adminUsersDb = [row, ...adminUsersDb];
  return row;
}

export async function updateAdminUser(id: string, patch: Partial<AdminUserRow>): Promise<AdminUserRow> {
  await mockDelay(450);
  adminUsersDb = adminUsersDb.map((u) => (u.id === id ? { ...u, ...patch } : u));
  return adminUsersDb.find((u) => u.id === id)!;
}

export async function toggleAdminUserStatus(id: string): Promise<AdminUserRow> {
  await mockDelay(400);
  adminUsersDb = adminUsersDb.map((u) =>
    u.id === id ? { ...u, status: u.status === "Active" ? "Suspended" : "Active" } : u
  );
  return adminUsersDb.find((u) => u.id === id)!;
}

export async function deleteAdminUser(id: string): Promise<void> {
  await mockDelay(400);
  adminUsersDb = adminUsersDb.filter((u) => u.id !== id);
}

export type RiderApprovalStatus = "Pending" | "Approved" | "Suspended";

export interface AdminRiderRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  plateNumber: string;
  docsStatus: "Verified" | "Expired" | "Submitted";
  rating: number | "New";
  approvalStatus: RiderApprovalStatus;
  facePhotoUri: string | null;
}

// Approval status lives in its own map rather than on RiderUser itself —
// it's an admin-side concern, not part of the rider's own profile shape.
const riderApprovalDb = new Map<string, RiderApprovalStatus>();

function approvalStatusFor(r: RiderUser): RiderApprovalStatus {
  return riderApprovalDb.get(r.id) ?? (r.trips > 0 ? "Approved" : "Pending");
}

function toAdminRiderRow(r: RiderUser): AdminRiderRow {
  const docsStatus = r.documents.every((d) => !d.required || (d.expiresAt && new Date(d.expiresAt) > new Date()))
    ? ("Verified" as const)
    : ("Expired" as const);
  return {
    id: r.id,
    name: r.fullName,
    phone: r.phone,
    email: r.email,
    vehicle: `${r.vehicleType} · ${r.plateNumber}`,
    plateNumber: r.plateNumber,
    docsStatus,
    rating: r.rating || "New",
    approvalStatus: approvalStatusFor(r),
    facePhotoUri: r.facePhotoUri,
  };
}

export async function fetchAdminRiders(): Promise<AdminRiderRow[]> {
  await mockDelay(500);
  return riderDb.map(toAdminRiderRow);
}

export async function setRiderApproval(id: string, status: RiderApprovalStatus): Promise<AdminRiderRow> {
  await mockDelay(450);
  const rider = riderDb.find((r) => r.id === id);
  if (!rider) throw new Error("Rider not found.");
  riderApprovalDb.set(id, status);
  return toAdminRiderRow(rider);
}

export async function updateAdminRider(id: string, patch: { fullName?: string; phone?: string; email?: string; plateNumber?: string; vehicleType?: RiderUser["vehicleType"] }): Promise<AdminRiderRow> {
  await mockDelay(450);
  riderDb = riderDb.map((r) => (r.id === id ? { ...r, ...patch } : r));
  return toAdminRiderRow(riderDb.find((r) => r.id === id)!);
}

export async function deleteAdminRider(id: string): Promise<void> {
  await mockDelay(400);
  riderDb = riderDb.filter((r) => r.id !== id);
}

/** Admin can manually re-verify a rider's documents, extending every required one by a year — same effect as the rider self-resubmitting. */
export async function adminVerifyRiderDocuments(id: string): Promise<AdminRiderRow> {
  await mockDelay(600);
  const idx = riderDb.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("Rider not found.");
  const renewed = riderDb[idx].documents.map((d) =>
    d.required ? { ...d, expiresAt: futureDate(365), uploadedAt: new Date().toISOString() } : d
  );
  riderDb[idx] = { ...riderDb[idx], documents: renewed };
  return toAdminRiderRow(riderDb[idx]);
}

export type AdminDeliveryStatus = "Pending" | "Arriving" | "In transit" | "Delivered" | "Cancelled";

export interface AdminDeliveryRow {
  id: string;
  route: string;
  rider: string;
  status: AdminDeliveryStatus;
  amount: number;
}

let adminDeliveriesDb: AdminDeliveryRow[] = [
  { id: "SS-20117", route: "Osu → East Legon", rider: "Kwame M.", status: "In transit", amount: 46.5 },
  { id: "SS-20116", route: "Kaneshie → Adenta", rider: "Yaw Darko", status: "Arriving", amount: 52 },
  { id: "SS-20115", route: "Dansoman → Airport Res.", rider: "—", status: "Pending", amount: 27 },
];

export async function fetchAdminDeliveries(): Promise<AdminDeliveryRow[]> {
  await mockDelay(500);
  return [...adminDeliveriesDb];
}

export async function createAdminDelivery(input: Omit<AdminDeliveryRow, "id">): Promise<AdminDeliveryRow> {
  await mockDelay(500);
  const row: AdminDeliveryRow = { ...input, id: `SS-${20100 + adminDeliveriesDb.length + 10}` };
  adminDeliveriesDb = [row, ...adminDeliveriesDb];
  return row;
}

export async function updateAdminDeliveryStatus(id: string, status: AdminDeliveryStatus): Promise<AdminDeliveryRow> {
  await mockDelay(450);
  adminDeliveriesDb = adminDeliveriesDb.map((d) => (d.id === id ? { ...d, status } : d));
  return adminDeliveriesDb.find((d) => d.id === id)!;
}

export async function reassignAdminDelivery(id: string, rider: string): Promise<AdminDeliveryRow> {
  await mockDelay(450);
  adminDeliveriesDb = adminDeliveriesDb.map((d) => (d.id === id ? { ...d, rider } : d));
  return adminDeliveriesDb.find((d) => d.id === id)!;
}

export async function deleteAdminDelivery(id: string): Promise<void> {
  await mockDelay(400);
  adminDeliveriesDb = adminDeliveriesDb.filter((d) => d.id !== id);
}

export type PaymentStatus = "Success" | "Processing" | "Pending" | "Failed";
export type PaymentType = "Delivery payment" | "Rider payout" | "Refund";

export interface AdminPaymentRow {
  id: string;
  user: string;
  type: PaymentType;
  amount: number;
  status: PaymentStatus;
}

let adminPaymentsDb: AdminPaymentRow[] = [
  { id: "TXN-88213", user: "Ama Owusu", type: "Delivery payment", amount: 46.5, status: "Success" },
  { id: "TXN-88212", user: "Kwame Mensah", type: "Rider payout", amount: 980, status: "Processing" },
  { id: "TXN-88211", user: "Efua Boateng", type: "Refund", amount: 27, status: "Pending" },
];

export async function fetchAdminPayments(): Promise<AdminPaymentRow[]> {
  await mockDelay(500);
  return [...adminPaymentsDb];
}

export async function createAdminPayment(input: Omit<AdminPaymentRow, "id">): Promise<AdminPaymentRow> {
  await mockDelay(500);
  const row: AdminPaymentRow = { ...input, id: `TXN-${88200 + adminPaymentsDb.length + 10}` };
  adminPaymentsDb = [row, ...adminPaymentsDb];
  return row;
}

export async function updateAdminPaymentStatus(id: string, status: PaymentStatus): Promise<AdminPaymentRow> {
  await mockDelay(450);
  adminPaymentsDb = adminPaymentsDb.map((p) => (p.id === id ? { ...p, status } : p));
  return adminPaymentsDb.find((p) => p.id === id)!;
}

export async function deleteAdminPayment(id: string): Promise<void> {
  await mockDelay(400);
  adminPaymentsDb = adminPaymentsDb.filter((p) => p.id !== id);
}

// ---------------------------------------------------------------------------
// Admin team management — admins can invite/remove other admins
// ---------------------------------------------------------------------------

export interface AdminTeamRow {
  id: string;
  fullName: string;
  email: string;
}

export async function fetchAdminTeam(): Promise<AdminTeamRow[]> {
  await mockDelay(400);
  return adminDb.map(({ id, fullName, email }) => ({ id, fullName, email }));
}

export async function inviteAdmin(input: { fullName: string; email: string; password: string }): Promise<AdminTeamRow> {
  await mockDelay(600);
  if (adminDb.some((a) => a.email === input.email)) throw new Error("An admin with this email already exists.");
  const row = { id: `admin-${adminDb.length + 1}`, role: "admin" as const, ...input };
  adminDb = [...adminDb, row];
  return { id: row.id, fullName: row.fullName, email: row.email };
}

export async function removeAdmin(id: string): Promise<void> {
  await mockDelay(400);
  adminDb = adminDb.filter((a) => a.id !== id);
}

export async function fetchAdminReports() {
  await mockDelay(500);
  return {
    revenueTrend: [30, 45, 40, 60, 72, 90],
    topRiders: [
      { name: "Kwame Mensah", amount: 6120 },
      { name: "Abena Sarpong", amount: 5480 },
      { name: "Yaw Darko", amount: 4910 },
    ],
    topCustomers: [
      { name: "Ama Owusu", deliveries: 28 },
      { name: "Kofi Asante", deliveries: 19 },
      { name: "Kwabena Appiah", deliveries: 15 },
    ],
  };
}

export function emptyDocumentSet(): RiderDocument[] {
  return [
    { kind: "idFront", label: "National ID (front)", required: true, uri: null, uploadedAt: null, expiresAt: null },
    { kind: "idBack", label: "National ID (back)", required: true, uri: null, uploadedAt: null, expiresAt: null },
    { kind: "drivingLicense", label: "Driving license", required: true, uri: null, uploadedAt: null, expiresAt: null },
    { kind: "insurance", label: "Vehicle insurance", required: true, uri: null, uploadedAt: null, expiresAt: null },
    { kind: "others", label: "Other supporting document", required: false, uri: null, uploadedAt: null, expiresAt: null },
  ];
}

export type { DocumentKind };
