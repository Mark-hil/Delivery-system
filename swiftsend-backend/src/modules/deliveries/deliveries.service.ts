import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
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
  ) {}

  // ---------------------------------------------------------
  // 1. DYNAMIC PRICE ESTIMATE
  // ---------------------------------------------------------
  async estimate(dto: EstimateDeliveryDto) {
    const settings = await this.settingsService.getSettings();

    let distanceKm: number;
    if (
      dto.pickupLat != null &&
      dto.pickupLng != null &&
      dto.dropoffLat != null &&
      dto.dropoffLng != null
    ) {
      distanceKm = haversineDistanceKm(
        dto.pickupLat,
        dto.pickupLng,
        dto.dropoffLat,
        dto.dropoffLng
      );
    } else {
      // Deterministic realistic distance based on address text length/content
      const seed = stringToSeed(dto.pickupAddress + dto.dropoffAddress);
      distanceKm = 3.5 + (seed % 105) / 10; // Generates between 3.5 and 14.0 km
    }

    distanceKm = Math.round(distanceKm * 10) / 10;
    const etaMinutes = Math.max(8, Math.round(distanceKm * 2.8));

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
      orderBy: { createdAt: "desc" },
    });

    return deliveries.map((d) => ({
      id: d.id,
      trackingNumber: d.trackingNumber,
      route: `${d.pickupAddress.split(",")[0]} → ${d.dropoffAddress.split(",")[0]}`,
      status: this.formatStatusLabel(d.status),
      amount: `GH₵ ${Number(d.totalFee).toFixed(2)}`,
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

    if (delivery.status !== "delivered") {
      throw new BadRequestException("Only completed deliveries can be rated");
    }

    if (delivery.rating !== null) {
      throw new BadRequestException("This delivery has already been rated");
    }

    await this.prisma.delivery.update({
      where: { id },
      data: {
        rating: dto.stars,
        ratingComment: dto.comment || null,
      },
    });

    // Recalculate rider's average rating if assigned
    if (delivery.riderId) {
      const aggregates = await this.prisma.delivery.aggregate({
        where: {
          riderId: delivery.riderId,
          rating: { not: null },
        },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const avg = aggregates._avg.rating || 5.0;
      await this.prisma.riderProfile.update({
        where: { id: delivery.riderId },
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
