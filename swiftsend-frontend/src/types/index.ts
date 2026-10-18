export type UserRole = "customer" | "rider" | "admin";

export interface CustomerUser {
  id: string;
  role: "customer";
  fullName: string;
  phone: string;
  email: string;
  avatarInitials: string;
  walletBalance: number;
}

export type DocumentKind =
  | "idFront"
  | "idBack"
  | "drivingLicense"
  | "insurance"
  | "others";

export interface RiderDocument {
  kind: DocumentKind;
  label: string;
  required: boolean;
  uri: string | null;
  uploadedAt: string | null;
  expiresAt: string | null; // ISO date; null = does not expire (e.g. "others")
}

export interface RiderUser {
  id: string;
  role: "rider";
  fullName: string;
  phone: string;
  email: string;
  vehicleType: "bike" | "car" | "van" | "truck";
  plateNumber: string;
  rating: number;
  trips: number;
  isOnline: boolean;
  documents: RiderDocument[];
  /** Live selfie captured during registration, for identity verification against
   * the uploaded ID — distinct from the ID documents themselves. Null until captured. */
  facePhotoUri: string | null;
}

export interface AdminUser {
  id: string;
  role: "admin";
  fullName: string;
  email: string;
}

export type AppUser = CustomerUser | RiderUser | AdminUser;

export type DeliveryStatus =
  | "pending"
  | "searching"
  | "accepted"
  | "arriving"
  | "pickedUp"
  | "inTransit"
  | "delivered"
  | "cancelled";

export interface DeliveryRequest {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  packageType: string;
  packageDescription: string;
  weight: string;
  instructions: string;
  deliveryType: "immediate" | "scheduled";
  vehicleType: "bike" | "car" | "van" | "truck";
  distanceKm: number;
  etaMinutes: number;
  baseFee: number;
  distanceFee: number;
  serviceFee: number;
  totalFee: number;
  status: DeliveryStatus;
  riderId?: string;
  riderName?: string;
  createdAt: string;
}

export interface OtpChallenge {
  destination: string; // phone or email
  purpose: "login" | "register" | "resetPassword" | "riderRegister";
  code: string; // mock — in a real backend this is never sent to the client
}
