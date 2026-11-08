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

/**
 * API service layer connecting SwiftSend Frontend to the NestJS Backend (`VITE_API_BASE_URL`)
 * with automatic JWT access/refresh token handling and seamless offline fallback to in-memory state
 * when the backend server is unreachable.
 */

const API_BASE_URL: string =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ?? "";

const ACCESS_TOKEN_KEY = "swiftsend_access_token";
const REFRESH_TOKEN_KEY = "swiftsend_refresh_token";
const lastVerifiedOtpByDest = new Map<string, string>();
const authExpiredListeners = new Set<() => void>();

export function onAuthExpired(listener: () => void): () => void {
  authExpiredListeners.add(listener);
  return () => {
    authExpiredListeners.delete(listener);
  };
}

function saveTokens(tokens?: { accessToken?: string; refreshToken?: string }) {
  if (!tokens || typeof window === "undefined") return;
  if (tokens.accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearAuthTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function hasActiveAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
}

/**
 * Calls the live NestJS backend.
 * - Returns `{ ok: true, data }` when the backend responds with 2xx.
 * - Throws an `Error` with the backend's message when the backend responds with 4xx/5xx.
 * - Returns `{ ok: false }` ONLY when a network error occurs (backend is offline), allowing callers
 *   to fall back to the local demo database seamlessly.
 */
async function apiCall<T>(
  path: string,
  options: RequestInit = {},
  retryOn401 = true
): Promise<{ ok: true; data: T } | { ok: false }> {
  const token = typeof window !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    return { ok: false };
  }

  if (
    res.status === 401 &&
    retryOn401 &&
    path !== "/auth/login" &&
    path !== "/auth/refresh" &&
    typeof window !== "undefined"
  ) {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const refreshText = await refreshRes.text();
          if (refreshText && refreshText.trim().length > 0) {
            const tokens = JSON.parse(refreshText);
            saveTokens(tokens);
            return apiCall<T>(path, options, false);
          }
        }
      } catch {
        // Ignore refresh network error
      }
    }
    // Refresh token is missing or rejected (401): clear stale auth tokens and notify AuthContext
    clearAuthTokens();
    authExpiredListeners.forEach((cb) => cb());
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const text = await res.text();
      if (text && text.trim().length > 0) {
        const errBody = JSON.parse(text);
        if (errBody?.message) {
          message = Array.isArray(errBody.message)
            ? errBody.message.join(", ")
            : String(errBody.message);
        }
      }
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  const text = await res.text();
  const data = (text && text.trim().length > 0 ? JSON.parse(text) : null) as T;
  return { ok: true, data };
}

export async function logout(): Promise<void> {
  const refreshToken =
    typeof window !== "undefined" ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
  try {
    await apiCall("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: refreshToken ?? undefined }),
    }, false);
  } catch {
    // Ignore logout errors
  } finally {
    clearAuthTokens();
  }
}

// ---------------------------------------------------------------------------
// In-memory demo state (no plaintext passwords or secrets in the client bundle)
// ---------------------------------------------------------------------------

let customerDb: CustomerUser[] = [
  {
    id: "cust-1",
    role: "customer",
    fullName: "Ama Owusu",
    phone: "0248125567",
    email: "ama.owusu@email.com",
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
  const licenseExpiry = opts?.expired ? futureDate(-2) : futureDate(21);
  const insuranceExpiry = opts?.expired ? futureDate(-2) : futureDate(180);
  return [
    { kind: "idFront", label: "National ID (front)", required: true, uri: "mock://id-front.jpg", uploadedAt: futureDate(-30), expiresAt: idExpiry },
    { kind: "idBack", label: "National ID (back)", required: true, uri: "mock://id-back.jpg", uploadedAt: futureDate(-30), expiresAt: idExpiry },
    { kind: "drivingLicense", label: "Driving license", required: true, uri: "mock://license.jpg", uploadedAt: futureDate(-30), expiresAt: licenseExpiry },
    { kind: "insurance", label: "Vehicle insurance", required: true, uri: "mock://insurance.jpg", uploadedAt: futureDate(-30), expiresAt: insuranceExpiry },
    { kind: "others", label: "Other supporting document", required: false, uri: null, uploadedAt: null, expiresAt: null },
  ];
}

let riderDb: RiderUser[] = [
  {
    id: "rider-1",
    role: "rider",
    fullName: "Kwame Mensah",
    phone: "0204451198",
    email: "kwame.mensah@email.com",
    vehicleType: "bike",
    plateNumber: "GT 4471-22",
    rating: 4.9,
    trips: 312,
    isOnline: true,
    documents: freshDocumentSet(),
    facePhotoUri: "mock://face-kwame.jpg",
  },
  {
    id: "rider-2",
    role: "rider",
    fullName: "Expired Eric",
    phone: "0551112222",
    email: "eric.expired@email.com",
    vehicleType: "car",
    plateNumber: "GT 9090-20",
    rating: 4.6,
    trips: 140,
    isOnline: false,
    documents: freshDocumentSet({ expired: true }),
    facePhotoUri: "mock://face-eric.jpg",
  },
];

let adminDb: AdminUser[] = [
  {
    id: "admin-1",
    role: "admin",
    fullName: "Nana Adjei",
    email: "admin@swiftsend.app",
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
  const res = await apiCall<PlatformSettings>("/settings");
  if (res.ok) {
    platformSettings = { ...platformSettings, ...res.data };
    return { ...platformSettings };
  }
  await mockDelay(200);
  return { ...platformSettings };
}

export async function updatePlatformSettings(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
  const res = await apiCall<PlatformSettings>("/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (res.ok) {
    platformSettings = { ...platformSettings, ...res.data };
    return { ...platformSettings };
  }
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
  const res = await apiCall<LoginResult & { tokens?: { accessToken?: string; refreshToken?: string } }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    }
  );
  if (res.ok) {
    saveTokens(res.data.tokens);
    return { role: res.data.role, user: res.data.user } as LoginResult;
  }

  throw new Error("Authentication server is unreachable. Please ensure the backend is running.");
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
  const res = await apiCall<{ user: CustomerUser; tokens?: { accessToken?: string; refreshToken?: string } }>(
    "/auth/customer/register",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
  if (res.ok) {
    saveTokens(res.data.tokens);
    return res.data.user;
  }

  throw new Error("Registration server is unreachable. Please ensure the backend is running.");
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
  const res = await apiCall<{ user: RiderUser; tokens?: { accessToken?: string; refreshToken?: string } }>(
    "/auth/rider/register",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
  if (res.ok) {
    saveTokens(res.data.tokens);
    return res.data.user;
  }

  throw new Error("Registration server is unreachable. Please ensure the backend is running.");
}

export async function riderSubmitDocuments(
  riderId: string,
  documents: RiderDocument[]
): Promise<RiderUser> {
  const res = await apiCall<RiderUser>("/rider/documents", {
    method: "POST",
    body: JSON.stringify({ documents }),
  });
  if (res.ok) {
    return res.data;
  }

  await mockDelay(900);
  const idx = riderDb.findIndex((u) => u.id === riderId);
  if (idx === -1) throw new Error("Rider not found.");
  const renewed = documents.map((d) =>
    d.required ? { ...d, expiresAt: futureDate(365), uploadedAt: new Date().toISOString() } : d
  );
  riderDb[idx] = { ...riderDb[idx], documents: renewed };
  return riderDb[idx];
}

// ---------------------------------------------------------------------------
// OTP (used for rider/customer registration verification AND password reset)
// ---------------------------------------------------------------------------

export async function requestOtp(destination: string, purpose: OtpChallenge["purpose"]): Promise<string> {
  const res = await apiCall<{ sent: boolean; devCode?: string }>("/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ destination, purpose }),
  });
  if (res.ok) {
    return res.data.devCode ?? "Sent via SMS";
  }

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
  const res = await apiCall<{ verified: boolean }>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ destination, purpose, code }),
  });
  if (res.ok) {
    if (res.data.verified) {
      lastVerifiedOtpByDest.set(destination.toLowerCase().trim(), code);
    }
    return Boolean(res.data.verified);
  }

  await mockDelay(500);
  const match = otpStore.find(
    (o) => o.destination === destination && o.purpose === purpose && o.code === code
  );
  if (match) {
    lastVerifiedOtpByDest.set(destination.toLowerCase().trim(), code);
  }
  return Boolean(match);
}

/** Works for any account type, since Login is unified and a person may not
 * remember whether they registered as a customer or a rider. */
export async function resetPassword(email: string, newPassword: string): Promise<void> {
  const otpCode = lastVerifiedOtpByDest.get(email.toLowerCase().trim()) || "000000";
  const res = await apiCall<{ reset: boolean }>("/auth/password-reset", {
    method: "POST",
    body: JSON.stringify({ email, newPassword, otpCode }),
  });
  if (res.ok) {
    lastVerifiedOtpByDest.delete(email.toLowerCase().trim());
    return;
  }

  throw new Error("Authentication server is unreachable. Please ensure the backend is running.");
}

// ---------------------------------------------------------------------------
// Delivery lifecycle (customer side)
// ---------------------------------------------------------------------------

export async function estimateDelivery(input: {
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  vehicleType: DeliveryRequest["vehicleType"];
}): Promise<Pick<DeliveryRequest, "distanceKm" | "etaMinutes" | "baseFee" | "distanceFee" | "serviceFee" | "totalFee">> {
  try {
    const res = await apiCall<
      Pick<DeliveryRequest, "distanceKm" | "etaMinutes" | "baseFee" | "distanceFee" | "serviceFee" | "totalFee">
    >("/deliveries/estimate", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (res.ok) {
      return res.data;
    }
  } catch {
    // Fall back to local calculation below if estimate endpoint fails
  }

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
  draft: Omit<DeliveryRequest, "id" | "status" | "createdAt"> & {
    pickupLat?: number;
    pickupLng?: number;
    dropoffLat?: number;
    dropoffLng?: number;
    paymentMethod?: "wallet" | "mobile_money" | "card";
  }
): Promise<DeliveryRequest> {
  const res = await apiCall<DeliveryRequest>("/deliveries/request", {
    method: "POST",
    body: JSON.stringify(draft),
  });
  if (res.ok) {
    return res.data;
  }

  await mockDelay(400);
  const delivery: DeliveryRequest = {
    ...draft,
    id: `SS-${20100 + Math.floor(Math.random() * 900)}`,
    status: "searching",
    createdAt: new Date().toISOString(),
  };
  return delivery;
}

export async function fetchDeliveryById(id: string): Promise<DeliveryRequest | null> {
  const res = await apiCall<DeliveryRequest>(`/deliveries/${encodeURIComponent(id)}`);
  if (res.ok) {
    return res.data;
  }
  return null;
}

export async function matchRider(delivery: DeliveryRequest): Promise<DeliveryRequest> {
  // Check backend to see if a real rider has accepted this delivery
  if (delivery.id) {
    const fetched = await fetchDeliveryById(delivery.id);
    if (fetched && fetched.status !== "searching") {
      return fetched;
    }
  }
  return delivery;
}

export async function completeDelivery(delivery: DeliveryRequest): Promise<DeliveryRequest> {
  if (delivery.id) {
    try {
      const res = await apiCall<DeliveryRequest>(
        `/deliveries/${encodeURIComponent(delivery.id)}/complete`,
        { method: "POST" }
      );
      if (res.ok) {
        return res.data;
      }
    } catch {
      // Fallback to local state transition if offline
    }
  }
  await mockDelay(500);
  return { ...delivery, status: "delivered" };
}

export async function submitRating(deliveryId: string, stars: number, comment: string): Promise<void> {
  const res = await apiCall(`/deliveries/${encodeURIComponent(deliveryId)}/rate`, {
    method: "POST",
    body: JSON.stringify({ stars, comment }),
  });
  if (res.ok) return;
  await mockDelay(500);
}

export interface OrderSummary {
  id: string;
  trackingNumber?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  route: string;
  status: DeliveryStatusLabel | string;
  amount: number;
  deliveryOtp?: string;
  riderName?: string | null;
  when: string;
}
export type DeliveryStatusLabel =
  | "In transit"
  | "In Transit"
  | "Arriving"
  | "Rider Arriving"
  | "Pending"
  | "Searching Rider"
  | "Rider Accepted"
  | "Picked Up"
  | "Delivered"
  | "Cancelled";

export async function fetchCustomerOrders(): Promise<OrderSummary[]> {
  const res = await apiCall<OrderSummary[]>("/customer/orders");
  if (res.ok) {
    return res.data;
  }

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
  const res = await apiCall<{ walletBalance: number; transactions: WalletTxn[] }>("/customer/wallet");
  if (res.ok && Array.isArray(res.data.transactions)) {
    return res.data.transactions;
  }

  await mockDelay(400);
  return [
    { id: "t1", label: "Delivery payment", when: new Date().toISOString(), amount: -46.5 },
    { id: "t2", label: "Paystack MoMo Top-up", when: new Date().toISOString(), amount: 150 },
    { id: "t3", label: "Delivery payment", when: new Date().toISOString(), amount: -27 },
  ];
}

export async function initializePaystackTopup(
  amount: number
): Promise<{ authorization_url: string; reference: string }> {
  const res = await apiCall<{ authorization_url: string; reference: string }>(
    "/payments/wallet/topup/initialize",
    {
      method: "POST",
      body: JSON.stringify({ amount }),
    }
  );
  if (res.ok) {
    return res.data;
  }
  const ref = `ss_topup_${Date.now()}`;
  return {
    authorization_url: `/customer/wallet?reference=${ref}&status=success`,
    reference: ref,
  };
}

export async function initializeDeliveryPayment(
  deliveryId: string,
  callbackUrl?: string
): Promise<{ authorization_url: string; reference: string }> {
  const res = await apiCall<{ authorization_url: string; reference: string }>(
    "/payments/delivery/initialize",
    {
      method: "POST",
      body: JSON.stringify({ deliveryId, callbackUrl }),
    }
  );
  if (res.ok) {
    return res.data;
  }
  const ref = `ss_del_${Date.now()}`;
  return {
    authorization_url: `${callbackUrl || "/customer/searching"}?reference=${ref}&status=success`,
    reference: ref,
  };
}

export async function verifyPaystackPayment(
  reference: string
): Promise<{ verified: boolean; walletBalance?: number }> {
  const res = await apiCall<{ verified: boolean; walletBalance?: number }>(
    `/payments/verify/${encodeURIComponent(reference)}`
  );
  if (res.ok) {
    return res.data;
  }
  return { verified: true, walletBalance: 264.3 };
}

// ---------------------------------------------------------------------------
// Rider job lifecycle
// ---------------------------------------------------------------------------

export interface IncomingRequest {
  id: string;
  trackingNumber?: string;
  pickupAddress: string;
  dropoffAddress: string;
  packageType: string;
  distanceKm: number;
  payout: number;
  totalFee?: number;
  customerName: string;
  customerPhone?: string;
}

export async function fetchAvailableJobs(): Promise<IncomingRequest[]> {
  const res = await apiCall<IncomingRequest[]>("/rider/available-jobs");
  if (res.ok && Array.isArray(res.data)) {
    return res.data;
  }
  return [];
}

export async function fetchCurrentRiderJob(): Promise<IncomingRequest | null> {
  const res = await apiCall<IncomingRequest | null>("/rider/current-job");
  if (res.ok) {
    return res.data;
  }
  return null;
}

export async function listenForRequest(): Promise<IncomingRequest | null> {
  // Check real backend queue for an actual customer delivery waiting for a rider
  try {
    const jobs = await fetchAvailableJobs();
    if (jobs.length > 0) {
      return jobs[0];
    }
  } catch {
    // Return null if network error
  }
  return null;
}

export async function acceptRequest(requestId: string): Promise<void> {
  const res = await apiCall(`/rider/jobs/${encodeURIComponent(requestId)}/accept`, {
    method: "POST",
  });
  if (res.ok) return;
  await mockDelay(400);
}

export async function confirmPickup(requestId: string): Promise<void> {
  const res = await apiCall(`/rider/jobs/${encodeURIComponent(requestId)}/pickup`, {
    method: "POST",
  });
  if (res.ok) return;
  await mockDelay(500);
}

export async function confirmDeliveryWithOtp(requestId: string, otp: string): Promise<boolean> {
  try {
    const res = await apiCall<{ success?: boolean; verified?: boolean }>(
      `/rider/jobs/${encodeURIComponent(requestId)}/complete`,
      {
        method: "POST",
        body: JSON.stringify({ otp }),
      }
    );
    if (res.ok) {
      return Boolean(res.data?.success || res.data?.verified || true);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already completed/i.test(msg)) {
      return true;
    }
    return false;
  }
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
  const res = await apiCall<EarningsSummary>("/rider/earnings");
  if (res.ok) {
    return res.data;
  }
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
  const res = await apiCall<{
    kpis?: {
      totalRevenue: number;
      activeDeliveries: number;
      totalDeliveries: number;
      totalRiders: number;
      totalCustomers: number;
    };
  }>("/admin/overview");
  if (res.ok && res.data.kpis) {
    return {
      totalUsers: res.data.kpis.totalCustomers,
      totalRiders: res.data.kpis.totalRiders,
      activeDeliveries: res.data.kpis.activeDeliveries,
      completedToday: res.data.kpis.totalDeliveries,
      revenueToday: res.data.kpis.totalRevenue,
      dailyDeliveries: [40, 55, 48, 70, 60, 85, 95],
      locationShare: [
        { label: "East Legon", pct: 40, color: "#16A34A" },
        { label: "Adenta", pct: 25, color: "#F5B700" },
        { label: "Dansoman", pct: 20, color: "#2563EB" },
        { label: "Other", pct: 15, color: "#9CA3AF" },
      ],
    };
  }

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
  const res = await apiCall<
    Array<{
      id: string;
      fullName: string;
      phone: string;
      email: string;
      status: "Active" | "Suspended";
      createdAt: string;
      details?: { trips?: number } | null;
    }>
  >("/admin/users?role=customer");
  if (res.ok) {
    adminUsersDb = res.data.map((u) => ({
      id: u.id,
      name: u.fullName,
      phone: u.phone,
      email: u.email,
      deliveries: u.details?.trips ?? 0,
      joined: new Date(u.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
      status: u.status,
    }));
    return [...adminUsersDb];
  }

  await mockDelay(500);
  return [...adminUsersDb];
}

export async function createAdminUser(input: Omit<AdminUserRow, "id" | "deliveries" | "joined">): Promise<AdminUserRow> {
  const res = await apiCall<{ id: string; fullName: string; email: string; status: "Active" | "Suspended" }>(
    "/admin/users",
    {
      method: "POST",
      body: JSON.stringify({
        fullName: input.name,
        email: input.email,
        phone: input.phone,
        password: "Password1",
        role: "customer",
      }),
    }
  );
  if (res.ok) {
    const row: AdminUserRow = {
      id: res.data.id,
      name: res.data.fullName,
      phone: input.phone,
      email: res.data.email,
      deliveries: 0,
      joined: new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
      status: res.data.status,
    };
    adminUsersDb = [row, ...adminUsersDb];
    return row;
  }

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
  const existing = adminUsersDb.find((u) => u.id === id);
  const nextStatus = existing?.status === "Active" ? "Suspended" : "Active";
  const res = await apiCall<{ id: string; status: "Active" | "Suspended" }>(
    `/admin/users/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    }
  );
  if (res.ok) {
    adminUsersDb = adminUsersDb.map((u) =>
      u.id === id ? { ...u, status: res.data.status } : u
    );
    return adminUsersDb.find((u) => u.id === id)!;
  }

  await mockDelay(400);
  adminUsersDb = adminUsersDb.map((u) =>
    u.id === id ? { ...u, status: u.status === "Active" ? "Suspended" : "Active" } : u
  );
  return adminUsersDb.find((u) => u.id === id)!;
}

export async function deleteAdminUser(id: string): Promise<void> {
  const res = await apiCall(`/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (res.ok) {
    adminUsersDb = adminUsersDb.filter((u) => u.id !== id);
    return;
  }
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
  const res = await apiCall<
    Array<{
      id: string;
      fullName: string;
      phone: string;
      email: string;
      vehicleType: string;
      plateNumber: string;
      rating: number;
      approvalStatus: RiderApprovalStatus;
      facePhotoUri: string | null;
      hasExpiredDoc: boolean;
      documents?: Array<{ isVerified?: boolean }>;
    }>
  >("/admin/riders");
  if (res.ok) {
    return res.data.map((r) => ({
      id: r.id,
      name: r.fullName,
      phone: r.phone,
      email: r.email,
      vehicle: `${r.vehicleType} · ${r.plateNumber}`,
      plateNumber: r.plateNumber,
      docsStatus: r.hasExpiredDoc
        ? "Expired"
        : r.documents?.every((d) => d.isVerified)
          ? "Verified"
          : "Submitted",
      rating: r.rating || "New",
      approvalStatus: r.approvalStatus,
      facePhotoUri: r.facePhotoUri,
    }));
  }

  await mockDelay(500);
  return riderDb.map(toAdminRiderRow);
}

export async function setRiderApproval(id: string, status: RiderApprovalStatus): Promise<AdminRiderRow> {
  const res = await apiCall(`/admin/riders/${encodeURIComponent(id)}/approval`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (res.ok) {
    const riders = await fetchAdminRiders();
    const updated = riders.find((r) => r.id === id);
    if (updated) return updated;
  }

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
  const res = await apiCall(`/admin/riders/${encodeURIComponent(id)}/verify-documents`, {
    method: "POST",
  });
  if (res.ok) {
    const riders = await fetchAdminRiders();
    const updated = riders.find((r) => r.id === id);
    if (updated) return updated;
  }

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

function mapBackendDeliveryStatus(status: string): AdminDeliveryStatus {
  if (status === "delivered") return "Delivered";
  if (status === "cancelled") return "Cancelled";
  if (status === "arriving") return "Arriving";
  if (status === "pickedUp" || status === "inTransit") return "In transit";
  return "Pending";
}

function mapFrontendDeliveryStatus(status: AdminDeliveryStatus): string {
  if (status === "Delivered") return "delivered";
  if (status === "Cancelled") return "cancelled";
  if (status === "Arriving") return "arriving";
  if (status === "In transit") return "inTransit";
  return "searching";
}

export async function fetchAdminDeliveries(): Promise<AdminDeliveryRow[]> {
  const res = await apiCall<
    Array<{
      id: string;
      pickupAddress: string;
      dropoffAddress: string;
      rider?: { name: string } | null;
      status: string;
      totalFee: number;
    }>
  >("/admin/deliveries");
  if (res.ok) {
    adminDeliveriesDb = res.data.map((d) => ({
      id: d.id,
      route: `${d.pickupAddress.split(",")[0]} → ${d.dropoffAddress.split(",")[0]}`,
      rider: d.rider?.name || "—",
      status: mapBackendDeliveryStatus(d.status),
      amount: d.totalFee,
    }));
    return [...adminDeliveriesDb];
  }

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
  const res = await apiCall(`/admin/deliveries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: mapFrontendDeliveryStatus(status) }),
  });
  if (res.ok) {
    adminDeliveriesDb = adminDeliveriesDb.map((d) => (d.id === id ? { ...d, status } : d));
    return adminDeliveriesDb.find((d) => d.id === id)!;
  }

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
  const res = await apiCall(`/admin/deliveries/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (res.ok) {
    adminDeliveriesDb = adminDeliveriesDb.filter((d) => d.id !== id);
    return;
  }
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
  const res = await apiCall<
    Array<{
      id: string;
      customerName: string;
      amount: number;
      status: string;
      deliveryId?: string | null;
    }>
  >("/admin/payments");
  if (res.ok) {
    adminPaymentsDb = res.data.map((p) => ({
      id: p.id,
      user: p.customerName,
      type: p.status === "Refunded" ? "Refund" : "Delivery payment",
      amount: p.amount,
      status: p.status === "Paid" ? "Success" : p.status === "Failed" ? "Failed" : "Pending",
    }));
    return [...adminPaymentsDb];
  }

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
  const backendStatus = status === "Success" ? "Paid" : status === "Failed" ? "Failed" : "Pending";
  const res = await apiCall(`/admin/payments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: backendStatus }),
  });
  if (res.ok) {
    adminPaymentsDb = adminPaymentsDb.map((p) => (p.id === id ? { ...p, status } : p));
    return adminPaymentsDb.find((p) => p.id === id)!;
  }

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
  const res = await apiCall<Array<{ id: string; fullName: string; email: string }>>("/admin/team");
  if (res.ok) {
    return res.data.map(({ id, fullName, email }) => ({ id, fullName, email }));
  }
  await mockDelay(400);
  return adminDb.map(({ id, fullName, email }) => ({ id, fullName, email }));
}

export async function inviteAdmin(input: { fullName: string; email: string; password: string }): Promise<AdminTeamRow> {
  const res = await apiCall<{ id: string; fullName: string; email: string }>("/admin/team", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      phone: `020${Math.floor(1000000 + Math.random() * 9000000)}`,
    }),
  });
  if (res.ok) {
    return { id: res.data.id, fullName: res.data.fullName, email: res.data.email };
  }

  throw new Error("Admin team management requires an authenticated backend session.");
}

export async function removeAdmin(id: string): Promise<void> {
  const res = await apiCall(`/admin/team/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (res.ok) {
    adminDb = adminDb.filter((a) => a.id !== id);
    return;
  }
  await mockDelay(400);
  adminDb = adminDb.filter((a) => a.id !== id);
}

export async function fetchAdminReports() {
  const res = await apiCall<{
    topRiders?: Array<{ name: string; trips: number }>;
  }>("/admin/reports");
  if (res.ok && res.data.topRiders) {
    return {
      revenueTrend: [30, 45, 40, 60, 72, 90],
      topRiders: res.data.topRiders.map((r) => ({ name: r.name, amount: r.trips * 35 })),
      topCustomers: [
        { name: "Ama Owusu", deliveries: 28 },
        { name: "Kofi Asante", deliveries: 19 },
        { name: "Kwabena Appiah", deliveries: 15 },
      ],
    };
  }

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
