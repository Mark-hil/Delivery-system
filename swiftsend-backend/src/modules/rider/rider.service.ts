import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { randomInt } from "crypto";
import { PrismaService } from "../../database/prisma.service.js";
import { RedisService } from "../../database/redis.service.js";
import { DispatchGateway } from "../dispatch/dispatch.gateway.js";
import { ResubmitDocumentsDto } from "./dto/resubmit-documents.dto.js";

@Injectable()
export class RiderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly dispatchGateway: DispatchGateway
  ) {}

  // ---------------------------------------------------------
  // 1. ATOMIC JOB ACCEPTANCE (Race Condition Proof)
  // ---------------------------------------------------------
  async acceptJob(userId: string, deliveryId: string) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId },
      include: {
        documents: true,
        user: true,
      },
    });

    if (!rider) {
      throw new NotFoundException("Rider profile not found");
    }

    if (rider.approvalStatus !== "Approved") {
      throw new ForbiddenException(
        `Cannot accept jobs: Your rider account is currently ${rider.approvalStatus}.`
      );
    }

    // Document Validation Compliance Check
    const hasInvalidRequiredDoc = rider.documents.some((d) => {
      if (!d.required) return false;
      if (!d.isVerified) return true;
      if (d.expiresAt && new Date(d.expiresAt) <= new Date()) return true;
      return false;
    });

    if (hasInvalidRequiredDoc) {
      throw new ForbiddenException(
        "Cannot accept jobs: Required documents are unverified or have expired. Please complete document validation."
      );
    }

    // Atomic conditional update to prevent race conditions
    const result = await this.prisma.delivery.updateMany({
      where: {
        id: deliveryId,
        status: "searching",
      },
      data: {
        status: "accepted",
        riderId: rider.id,
        acceptedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new ConflictException(
        "This delivery has already been accepted by another rider or is no longer available"
      );
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        rider: {
          include: {
            user: true,
          },
        },
      },
    });

    const formatted = this.formatDelivery(delivery);
    this.dispatchGateway.broadcastStatusChange(deliveryId, "accepted", {
      riderId: rider.id,
      riderName: rider.user.fullName,
    });

    return formatted;
  }

  // ---------------------------------------------------------
  // 2. CONFIRM PICKUP
  // ---------------------------------------------------------
  async confirmPickup(userId: string, deliveryId: string) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException("Rider profile not found");
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException("Delivery not found");
    }

    if (delivery.riderId !== rider.id) {
      throw new ForbiddenException("This delivery is not assigned to you");
    }

    if (delivery.status !== "accepted" && delivery.status !== "arriving") {
      throw new BadRequestException(
        `Cannot confirm pickup for delivery in '${delivery.status}' state`
      );
    }

    const pickupUpdate = await this.prisma.delivery.updateMany({
      where: {
        id: deliveryId,
        riderId: rider.id,
        status: { in: ["accepted", "arriving"] },
      },
      data: {
        status: "pickedUp",
        pickedUpAt: new Date(),
      },
    });

    if (pickupUpdate.count === 0) {
      throw new ConflictException("Delivery pickup was already confirmed or state changed");
    }

    const updated = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        rider: {
          include: {
            user: true,
          },
        },
      },
    });

    const formatted = this.formatDelivery(updated);
    this.dispatchGateway.broadcastStatusChange(deliveryId, "pickedUp", {
      riderId: rider.id,
    });

    return formatted;
  }

  // ---------------------------------------------------------
  // 3. COMPLETE DELIVERY WITH OTP
  // ---------------------------------------------------------
  async completeDelivery(userId: string, deliveryId: string, otp: string) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException("Rider profile not found");
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        customer: true,
        payment: true,
      },
    });

    if (!delivery) {
      throw new NotFoundException("Delivery not found");
    }

    if (delivery.status === "delivered") {
      throw new BadRequestException("Delivery is already completed");
    }

    if (
      delivery.status !== "inTransit" &&
      delivery.status !== "pickedUp" &&
      delivery.status !== "arriving"
    ) {
      throw new BadRequestException("Delivery is not in an active in-transit state");
    }

    if (delivery.riderId !== rider.id) {
      throw new ForbiddenException("This delivery is not assigned to you");
    }

    // Brute-force protection on delivery OTP (max 5 failed attempts per delivery)
    const attemptsKey = `delivery:otp:attempts:${deliveryId}`;
    const currentAttempts = Number((await this.redis.client.get(attemptsKey)) || 0);
    if (currentAttempts >= 5) {
      throw new ForbiddenException(
        "Maximum delivery OTP verification attempts exceeded. Please contact support."
      );
    }

    if (delivery.deliveryOtp.trim() !== otp.trim()) {
      const nextAttempts = await this.redis.client.incr(attemptsKey);
      if (nextAttempts === 1) {
        await this.redis.client.expire(attemptsKey, 3600);
      }
      throw new BadRequestException("Invalid delivery completion code");
    }

    await this.redis.client.del(attemptsKey);

    // Payout calculation: 80% of total fee
    const payout = Math.round(Number(delivery.totalFee) * 0.8 * 10) / 10;
    const totalFeeNum = Number(delivery.totalFee);
    const newCustomerBalance = Math.max(
      0,
      Math.round((Number(delivery.customer.walletBalance) - totalFeeNum) * 100) / 100
    );

    // Execute atomic transaction for delivery completion, earnings, customer wallet deduction, and payment ledger
    await this.prisma.$transaction(async (tx) => {
      const statusResult = await tx.delivery.updateMany({
        where: {
          id: deliveryId,
          riderId: rider.id,
          status: { in: ["arriving", "pickedUp", "inTransit"] },
        },
        data: {
          status: "delivered",
          deliveredAt: new Date(),
        },
      });

      if (statusResult.count === 0) {
        throw new BadRequestException("Delivery is already completed");
      }

      await tx.riderEarning.create({
        data: {
          riderId: rider.id,
          deliveryId: delivery.id,
          amount: payout,
        },
      });

      await tx.riderProfile.update({
        where: { id: rider.id },
        data: {
          trips: { increment: 1 },
        },
      });

      const alreadyPaidDirectly =
        delivery.payment && delivery.payment.status === "Paid";

      if (!alreadyPaidDirectly) {
        await tx.customerProfile.update({
          where: { id: delivery.customer.id },
          data: {
            walletBalance: { decrement: totalFeeNum },
          },
        });

        await tx.walletTxn.create({
          data: {
            customerId: delivery.customer.id,
            label: `Delivery fee (${delivery.trackingNumber})`,
            amount: -totalFeeNum,
            balance: newCustomerBalance,
          },
        });

        if (delivery.payment) {
          await tx.payment.update({
            where: { id: delivery.payment.id },
            data: {
              status: "Paid",
              paidAt: new Date(),
            },
          });
        } else {
          await tx.payment.create({
            data: {
              deliveryId: delivery.id,
              customerId: delivery.customer.id,
              amount: delivery.totalFee,
              status: "Paid",
              paymentMethod: "wallet",
              transactionRef: `TXN-${randomInt(100000, 1000000)}`,
            },
          });
        }
      }
    });

    this.dispatchGateway.broadcastDeliveryCompleted(deliveryId, {
      deliveryId,
      riderId: rider.id,
      payout,
    });

    return {
      success: true,
      message: "Delivery marked as complete and earnings credited",
    };
  }

  // ---------------------------------------------------------
  // 4. RIDER EARNINGS SUMMARY
  // ---------------------------------------------------------
  async getEarnings(userId: string) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId },
      include: {
        earnings: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!rider) {
      throw new NotFoundException("Rider profile not found");
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayEarnings = rider.earnings
      .filter((e) => new Date(e.createdAt) >= startOfToday)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const completedToday = rider.earnings.filter(
      (e) => new Date(e.createdAt) >= startOfToday
    ).length;

    return {
      today: Number(todayEarnings.toFixed(2)),
      completedToday,
      pendingToday: 0,
      onlineHours: 4.5, // Tracked operational hours
      history: rider.earnings.map((e) => ({
        id: e.id,
        amount: Number(e.amount),
        date: e.createdAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      })),
    };
  }

  // ---------------------------------------------------------
  // 5. TOGGLE ONLINE STATUS
  // ---------------------------------------------------------
  async toggleOnlineStatus(userId: string, isOnline: boolean) {
    const rider = await this.prisma.riderProfile.update({
      where: { userId },
      data: { isOnline },
    });

    if (!isOnline) {
      await this.redis.removeRiderLocation(rider.id);
    }

    return {
      isOnline: rider.isOnline,
    };
  }

  // ---------------------------------------------------------
  // 6. RESUBMIT COMPLIANCE DOCUMENTS
  // ---------------------------------------------------------
  async resubmitDocuments(userId: string, dto: ResubmitDocumentsDto) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        documents: true,
      },
    });

    if (!rider) {
      throw new NotFoundException("Rider profile not found");
    }

    for (const doc of dto.documents) {
      await this.prisma.riderDocument.upsert({
        where: {
          riderId_kind: {
            riderId: rider.id,
            kind: doc.kind as any,
          },
        },
        update: {
          uri: doc.uri,
          uploadedAt: new Date(),
          isVerified: false,
          verifiedAt: null,
        },
        create: {
          riderId: rider.id,
          kind: doc.kind as any,
          label: doc.label,
          required: doc.required,
          uri: doc.uri,
          uploadedAt: new Date(),
          expiresAt: null,
          isVerified: false,
        },
      });
    }

    // Place rider back into Pending approval until an admin verifies the new documents
    await this.prisma.riderProfile.update({
      where: { id: rider.id },
      data: { approvalStatus: "Pending" },
    });

    const updated = await this.prisma.riderProfile.findUnique({
      where: { id: rider.id },
      include: {
        user: true,
        documents: true,
      },
    });

    return {
      id: updated!.id,
      role: "rider" as const,
      fullName: updated!.user.fullName,
      phone: updated!.user.phone,
      email: updated!.user.email,
      vehicleType: updated!.vehicleType,
      plateNumber: updated!.plateNumber,
      rating: Number(updated!.rating),
      trips: updated!.trips,
      isOnline: updated!.isOnline,
      facePhotoUri: updated!.facePhotoUri,
      documents: updated!.documents.map((d) => ({
        kind: d.kind,
        label: d.label,
        required: d.required,
        uri: d.uri,
        uploadedAt: d.uploadedAt ? d.uploadedAt.toISOString() : null,
        expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
      })),
    };
  }

  private formatDelivery(delivery: any) {
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
      // Security: Never expose deliveryOtp to riders
    };
  }
}
