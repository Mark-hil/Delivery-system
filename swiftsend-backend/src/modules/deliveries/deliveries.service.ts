import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomInt } from "crypto";
import { PrismaService } from "../../database/prisma.service.js";
import { RedisService } from "../../database/redis.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { DispatchGateway } from "../dispatch/dispatch.gateway.js";
import { EstimateDeliveryDto } from "./dto/estimate-delivery.dto.js";
import { CreateDeliveryDto } from "./dto/create-delivery.dto.js";
import { RateDeliveryDto } from "./dto/rate-delivery.dto.js";
import type { CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";
import { SmsService } from "../sms/sms.service.js";

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const GHANA_CITY_COORDS: Array<{ keywords: string[]; lat: number; lng: number }> = [
  { keywords: ["osu", "oxford"], lat: 5.556, lng: -0.1826 },
  { keywords: ["east legon", "boundary"], lat: 5.6358, lng: -0.1614 },
  { keywords: ["accra mall", "tetteh quarshie"], lat: 5.6225, lng: -0.1733 },
  { keywords: ["kotoka", "airport"], lat: 5.6052, lng: -0.1718 },
  { keywords: ["spintex"], lat: 5.6295, lng: -0.1045 },
  { keywords: ["madina", "zongo junction"], lat: 5.6784, lng: -0.167 },
  { keywords: ["legon", "university of ghana"], lat: 5.6506, lng: -0.187 },
  { keywords: ["circle", "kwame nkrumah", "kaneshie", "lapaz", "achimota", "dansoman", "accra"], lat: 5.5698, lng: -0.2145 },
  { keywords: ["tema"], lat: 5.6698, lng: -0.0166 },
  { keywords: ["knust", "tech junction", "ayigya"], lat: 6.6745, lng: -1.5716 },
  { keywords: ["kejetia", "adum", "kumasi", "asokwa", "bantama", "suame"], lat: 6.698, lng: -1.6231 },
  { keywords: ["obuasi"], lat: 6.2023, lng: -1.6674 },
  { keywords: ["takoradi", "market circle", "sekondi"], lat: 4.8975, lng: -1.7592 },
  { keywords: ["tarkwa", "umat"], lat: 5.3018, lng: -1.9896 },
  { keywords: ["tamale", "aboabo", "tth"], lat: 9.4034, lng: -0.8424 },
  { keywords: ["cape coast", "ucc", "elmina"], lat: 5.1155, lng: -1.2909 },
  { keywords: ["winneba", "uew"], lat: 5.3511, lng: -0.6295 },
  { keywords: ["kasoa"], lat: 5.5345, lng: -0.4244 },
  { keywords: ["koforidua", "new juaben"], lat: 6.0941, lng: -0.2591 },
  { keywords: ["nkawkaw", "kwahu"], lat: 6.5512, lng: -0.7668 },
  { keywords: ["ho", "uhas"], lat: 6.6108, lng: 0.4713 },
  { keywords: ["hohoe"], lat: 7.1519, lng: 0.4736 },
  { keywords: ["sunyani", "uenr"], lat: 7.3399, lng: -2.3268 },
  { keywords: ["techiman"], lat: 7.5897, lng: -1.9344 },
  { keywords: ["goaso"], lat: 6.8036, lng: -2.517 },
  { keywords: ["bolgatanga", "bolga", "bawku", "navrongo"], lat: 10.7856, lng: -0.8514 },
  { keywords: ["wa", "ubids"], lat: 10.0601, lng: -2.5019 },
  { keywords: ["sefwi", "wiawso"], lat: 6.2059, lng: -2.4894 },
  { keywords: ["damongo"], lat: 9.0844, lng: -1.8185 },
  { keywords: ["dambai"], lat: 8.0686, lng: 0.1792 },
  { keywords: ["nalerigu", "walewale"], lat: 10.5253, lng: -0.3698 },
];

function matchGhanaCoordsSync(address: string | undefined): { lat: number; lng: number } | null {
  if (!address || !address.trim()) return null;
  const lower = address.toLowerCase();
  for (const item of GHANA_CITY_COORDS) {
    if (item.keywords.some((k) => lower.includes(k))) {
      return { lat: item.lat, lng: item.lng };
    }
  }
  return null;
}

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly settingsService: SettingsService,
    private readonly dispatchGateway: DispatchGateway,
    private readonly smsService: SmsService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  // ---------------------------------------------------------
  // 1. DYNAMIC PRICE ESTIMATE
  // ---------------------------------------------------------
  async estimate(dto: EstimateDeliveryDto) {
    const settings = await this.settingsService.getSettings();

    let distanceKm: number | null = null;
    let etaMinutes: number | null = null;

    const pickupCoords =
      dto.pickupLat != null && dto.pickupLng != null
        ? { lat: dto.pickupLat, lng: dto.pickupLng }
        : matchGhanaCoordsSync(dto.pickupAddress);
    const dropoffCoords =
      dto.dropoffLat != null && dto.dropoffLng != null
        ? { lat: dto.dropoffLat, lng: dto.dropoffLng }
        : matchGhanaCoordsSync(dto.dropoffAddress);

    // 1. If GOOGLE_MAPS_SERVER_API_KEY is configured, query Google Distance Matrix API for real road distance & traffic ETA across Ghana
    const gmapsServerKey = (
      this.configService?.get<string>("GOOGLE_MAPS_SERVER_API_KEY") ??
      process.env.GOOGLE_MAPS_SERVER_API_KEY ??
      ""
    ).trim();

    if (gmapsServerKey) {
      try {
        const origins = pickupCoords
          ? `${pickupCoords.lat},${pickupCoords.lng}`
          : `${dto.pickupAddress}, Ghana`;
        const destinations = dropoffCoords
          ? `${dropoffCoords.lat},${dropoffCoords.lng}`
          : `${dto.dropoffAddress}, Ghana`;
        const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
        url.searchParams.set("origins", origins);
        url.searchParams.set("destinations", destinations);
        url.searchParams.set("mode", "driving");
        url.searchParams.set("region", "gh");
        url.searchParams.set("departure_time", "now");
        url.searchParams.set("key", gmapsServerKey);

        const res = await fetch(url.toString());
        if (res.ok) {
          const data = (await res.json()) as any;
          const element = data?.rows?.[0]?.elements?.[0];
          if (element?.status === "OK" && element?.distance?.value) {
            distanceKm = Math.max(1.0, element.distance.value / 1000);
            const durationSec =
              element.duration_in_traffic?.value ?? element.duration?.value ?? distanceKm * 168;
            etaMinutes = Math.max(8, Math.round(durationSec / 60));
          }
        }
      } catch {
        // Gracefully fall back to OSRM / Haversine calculation below
      }
    }

    // 2. Bolt / Yango / Uber-style OSRM road-graph routing across all 16 regions of Ghana
    if (
      distanceKm == null &&
      dto.pickupLat != null &&
      dto.pickupLng != null &&
      dto.dropoffLat != null &&
      dto.dropoffLng != null
    ) {
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${dto.pickupLng},${dto.pickupLat};${dto.dropoffLng},${dto.dropoffLng}?overview=false`;
        const res = await fetch(osrmUrl, { signal: AbortSignal.timeout(2200) });
        if (res.ok) {
          const data = (await res.json()) as {
            routes?: Array<{ distance?: number; duration?: number }>;
          };
          const route = data?.routes?.[0];
          if (route?.distance) {
            distanceKm = Math.max(1.0, route.distance / 1000);
            if (route.duration) {
              etaMinutes = Math.max(8, Math.round(route.duration / 60));
            }
          }
        }
      } catch {
        // Fallback to Haversine * 1.25 below if OSRM is unreachable
      }
    }

    // 3. Fallback to nationwide Ghana coordinate Haversine * 1.25 (road winding factor) or deterministic address seed
    if (distanceKm == null) {
      if (pickupCoords && dropoffCoords) {
        const straightLineKm = haversineDistanceKm(
          pickupCoords.lat,
          pickupCoords.lng,
          dropoffCoords.lat,
          dropoffCoords.lng
        );
        distanceKm = Math.max(1.2, straightLineKm * 1.25);
      } else {
        // Deterministic realistic distance based on address text length/content
        const seed = stringToSeed(dto.pickupAddress + dto.dropoffAddress);
        distanceKm = 3.5 + (seed % 105) / 10; // Generates between 3.5 and 14.0 km
      }
    }

    distanceKm = Math.round(distanceKm * 10) / 10;
    if (etaMinutes == null) {
      etaMinutes = Math.max(8, Math.round(distanceKm * 2.8));
    }

    const vehicleMultipliers: Record<string, number> = {
      bike: 1.0,
      car: 1.35,
      van: 1.8,
      truck: 2.5,
    };
    const mult = vehicleMultipliers[dto.vehicleType] || 1.0;

    const baseFee = settings.baseFee;
    const distanceFee = Math.round(distanceKm * settings.perKmRate * 10) / 10;
    const serviceFee = settings.serviceFee;
    const totalFee = Math.round(((baseFee + distanceFee) * mult + serviceFee) * 10) / 10;

    return {
      distanceKm,
      etaMinutes,
      baseFee,
      distanceFee,
      serviceFee,
      totalFee,
    };
  }

  // ---------------------------------------------------------
  // 2. CREATE DELIVERY REQUEST
  // ---------------------------------------------------------
  async create(userId: string, dto: CreateDeliveryDto) {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!customer) {
      throw new BadRequestException("Only registered customers can create delivery requests");
    }

    // 1. Calculate authoritative pricing server-side to prevent client fee tampering
    const calculatedEstimate = await this.estimate({
      pickupAddress: dto.pickupAddress,
      dropoffAddress: dto.dropoffAddress,
      vehicleType: dto.vehicleType,
      pickupLat: dto.pickupLat,
      pickupLng: dto.pickupLng,
      dropoffLat: dto.dropoffLat,
      dropoffLng: dto.dropoffLng,
    });

    const totalFee = calculatedEstimate.totalFee;
    const baseFee = calculatedEstimate.baseFee;
    const distanceFee = calculatedEstimate.distanceFee;
    const serviceFee = calculatedEstimate.serviceFee;
    const distanceKm = calculatedEstimate.distanceKm;
    const etaMinutes = calculatedEstimate.etaMinutes;

    // 2. Validate customer wallet balance ONLY when paying via SwiftSend Wallet
    // Customers choosing direct Paystack checkout ("mobile_money" | "card") pay the calculated fare directly
    const paymentMethod = dto.paymentMethod || "wallet";
    if (paymentMethod === "wallet") {
      let reservedTotal = 0;
      if (this.prisma.delivery.aggregate) {
        const activeOrders = await this.prisma.delivery.aggregate({
          where: {
            customerId: customer.id,
            status: {
              in: ["searching", "accepted", "arriving", "pickedUp", "inTransit"],
            },
          },
          _sum: { totalFee: true },
        });
        reservedTotal = Number(activeOrders?._sum?.totalFee || 0);
      }

      const availableBalance = Math.max(0, Number(customer.walletBalance) - reservedTotal);
      if (availableBalance < totalFee) {
        throw new BadRequestException(
          `Insufficient wallet balance. Available balance: GHS ${availableBalance.toFixed(2)}, required: GHS ${totalFee.toFixed(2)}`
        );
      }
    }

    // Generate 4-digit Proof-of-Delivery OTP using CSPRNG
    const deliveryOtp = randomInt(1000, 10000).toString();
    const trackingNumber = `SW-${randomInt(100000, 1000000)}`;

    const delivery = await this.prisma.delivery.create({
      data: {
        trackingNumber,
        customerId: customer.id,
        pickupAddress: dto.pickupAddress,
        pickupLatitude: dto.pickupLat ?? 5.6037,
        pickupLongitude: dto.pickupLng ?? -0.187,
        dropoffAddress: dto.dropoffAddress,
        dropoffLatitude: dto.dropoffLat ?? 5.556,
        dropoffLongitude: dto.dropoffLng ?? -0.183,
        packageType: dto.packageType,
        packageDescription: dto.packageDescription,
        weight: dto.weight,
        instructions: dto.instructions || null,
        deliveryType: dto.deliveryType,
        vehicleType: dto.vehicleType,
        distanceKm,
        etaMinutes,
        baseFee,
        distanceFee,
        serviceFee,
        totalFee,
        status: "searching",
        deliveryOtp,
      },
      include: {
        rider: {
          include: {
            user: true,
          },
        },
      },
    });

    const formattedForCustomer = this.formatDelivery(delivery, "customer");
    const formattedForRider = this.formatDelivery(delivery, "rider");

    // Broadcast new job to nearby online riders via Redis Geo and WebSocket (without deliveryOtp)
    try {
      const nearby = await this.redis.findNearbyRiders(
        delivery.pickupLatitude,
        delivery.pickupLongitude,
        25
      );
      this.dispatchGateway.broadcastNewJob(
        formattedForRider,
        nearby.map((r) => r.riderId)
      );
    } catch (err) {
      // Non-fatal if broadcast fails
    }

    // Dispatch Delivery Verification OTP via Arkesel SMS to the parcel receiver
    const targetPhone = dto.recipientPhone || customer.user.phone;
    if (targetPhone) {
      try {
        await this.smsService.sendDeliveryReceiverAlert(
          targetPhone,
          customer.user.fullName,
          deliveryOtp,
          delivery.trackingNumber
        );
      } catch (err) {
        // Non-fatal if SMS dispatch fails
      }
    }

    return formattedForCustomer;
  }

  // ---------------------------------------------------------
  // 3. GET DELIVERY BY ID (Secured with BOLA Authorization)
  // ---------------------------------------------------------
  async findById(id: string, user: CurrentUserPayload) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: true,
        rider: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery with id ${id} not found`);
    }

    // BOLA Authorization Check: Only owner customer, assigned rider, or admin can view
    if (user.role === "customer") {
      const customer = await this.prisma.customerProfile.findUnique({
        where: { userId: user.userId },
      });
      if (!customer || delivery.customerId !== customer.id) {
        throw new ForbiddenException("You do not have permission to view this delivery");
      }
    } else if (user.role === "rider") {
      const rider = await this.prisma.riderProfile.findUnique({
        where: { userId: user.userId },
      });
      if (!rider || delivery.riderId !== rider.id) {
        throw new ForbiddenException("You do not have permission to view this delivery");
      }
    }

    return this.formatDelivery(delivery, user.role);
  }

  // ---------------------------------------------------------
  // 4. CUSTOMER ORDERS HISTORY
  // ---------------------------------------------------------
  async getCustomerOrders(userId: string) {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (!customer) {
      return [];
    }

    const deliveries = await this.prisma.delivery.findMany({
      where: { customerId: customer.id },
      include: {
        rider: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return deliveries.map((d) => ({
      id: d.id,
      trackingNumber: d.trackingNumber,
      pickupAddress: d.pickupAddress,
      dropoffAddress: d.dropoffAddress,
      route: `${d.pickupAddress.split(",")[0]} → ${d.dropoffAddress.split(",")[0]}`,
      status: this.formatStatusLabel(d.status),
      amount: Number(d.totalFee),
      deliveryOtp: d.deliveryOtp,
      riderName: d.rider?.user?.fullName ?? null,
      when: d.createdAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  }

  // ---------------------------------------------------------
  // 5. CUSTOMER WALLET
  // ---------------------------------------------------------
  async getCustomerWallet(userId: string) {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
      include: {
        walletTxns: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException("Customer profile not found");
    }

    return {
      balance: Number(customer.walletBalance),
      txns: customer.walletTxns.map((t) => ({
        id: t.id,
        label: t.label,
        when: t.createdAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        amount: Number(t.amount),
      })),
    };
  }

  // ---------------------------------------------------------
  // 5B. COMPLETE DELIVERY (Customer tracking completion / receipt confirmation)
  // ---------------------------------------------------------
  async completeByCustomer(id: string, user: CurrentUserPayload) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: true,
        rider: { include: { user: true } },
      },
    });

    if (!delivery) {
      throw new NotFoundException("Delivery not found");
    }

    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId: user.userId },
    });

    if (!customer || delivery.customerId !== customer.id) {
      throw new ForbiddenException("You can only complete your own deliveries");
    }

    // Assign default rider if simulated customer tracking finished before rider accepted
    let riderId = delivery.riderId;
    if (!riderId) {
      const defaultRider = await this.prisma.riderProfile.findFirst();
      if (defaultRider) {
        riderId = defaultRider.id;
      }
    }

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        status: "delivered",
        riderId,
        deliveredAt: delivery.deliveredAt ?? new Date(),
      },
      include: {
        customer: true,
        rider: { include: { user: true } },
      },
    });

    return this.formatDelivery(updated, user.role);
  }

  // ---------------------------------------------------------
  // 6. RATE RIDER (Secured with Ownership & Status Checks)
  // ---------------------------------------------------------
  async rateDelivery(id: string, dto: RateDeliveryDto, user: CurrentUserPayload) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      throw new NotFoundException("Delivery not found");
    }

    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId: user.userId },
    });

    if (!customer || delivery.customerId !== customer.id) {
      throw new ForbiddenException("You can only rate your own deliveries");
    }

    if (delivery.status === "cancelled") {
      throw new BadRequestException("Cancelled deliveries cannot be rated");
    }

    if (delivery.rating !== null) {
      throw new BadRequestException("This delivery has already been rated");
    }

    // Ensure rider is linked and status is marked delivered when customer submits final rating
    let riderId = delivery.riderId;
    if (!riderId) {
      const defaultRider = await this.prisma.riderProfile.findFirst();
      if (defaultRider) {
        riderId = defaultRider.id;
      }
    }

    await this.prisma.delivery.update({
      where: { id },
      data: {
        status: "delivered",
        riderId,
        deliveredAt: delivery.deliveredAt ?? new Date(),
        rating: dto.stars,
        ratingComment: dto.comment || null,
      },
    });

    // Recalculate rider's average rating if assigned
    if (riderId) {
      const aggregates = await this.prisma.delivery.aggregate({
        where: {
          riderId,
          rating: { not: null },
        },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const avg = aggregates._avg.rating || 5.0;
      await this.prisma.riderProfile.update({
        where: { id: riderId },
        data: {
          rating: Math.round(avg * 10) / 10,
        },
      });
    }

    return {
      success: true,
      message: "Rating submitted successfully",
    };
  }

  // ---------------------------------------------------------
  // FORMATTERS
  // ---------------------------------------------------------
  private formatDelivery(delivery: any, userRole?: string) {
    return {
      id: delivery.id,
      trackingNumber: delivery.trackingNumber,
      pickupAddress: delivery.pickupAddress,
      dropoffAddress: delivery.dropoffAddress,
      packageType: delivery.packageType,
      packageDescription: delivery.packageDescription,
      weight: delivery.weight,
      instructions: delivery.instructions || "",
      deliveryType: delivery.deliveryType,
      vehicleType: delivery.vehicleType,
      distanceKm: Number(delivery.distanceKm),
      etaMinutes: delivery.etaMinutes,
      baseFee: Number(delivery.baseFee),
      distanceFee: Number(delivery.distanceFee),
      serviceFee: Number(delivery.serviceFee),
      totalFee: Number(delivery.totalFee),
      status: delivery.status,
      riderId: delivery.riderId || undefined,
      riderName: delivery.rider?.user?.fullName || undefined,
      createdAt: delivery.createdAt.toISOString(),
      // Security: Only expose the deliveryOtp to the customer or admin; never to riders
      deliveryOtp:
        userRole === "customer" || userRole === "admin"
          ? delivery.deliveryOtp
          : undefined,
    };
  }

  private formatStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: "Pending",
      searching: "Searching Rider",
      accepted: "Rider Accepted",
      arriving: "Rider Arriving",
      pickedUp: "Picked Up",
      inTransit: "In Transit",
      delivered: "Delivered",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  }
}
