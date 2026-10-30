import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma.service.js";
import { DispatchGateway } from "../dispatch/dispatch.gateway.js";
import { CreateUserDto } from "./dto/create-user.dto.js";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto.js";
import { UpdateRiderApprovalDto } from "./dto/update-rider-approval.dto.js";
import { UpdateDeliveryDto } from "./dto/update-delivery.dto.js";
import { UpdatePaymentDto } from "./dto/update-payment.dto.js";
import { InviteTeamDto } from "./dto/invite-team.dto.js";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatchGateway: DispatchGateway
  ) {}

  // =========================================================
  // 1. OVERVIEW & ANALYTICS
  // =========================================================

  async getOverview() {
    const [
      totalRevenueResult,
      activeDeliveriesCount,
      totalDeliveriesCount,
      totalRidersCount,
      onlineRidersCount,
      totalCustomersCount,
      pendingRiderApprovalsCount,
      recentDeliveries,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: "Paid" },
        _sum: { amount: true },
      }),
      this.prisma.delivery.count({
        where: {
          status: {
            in: ["searching", "accepted", "arriving", "pickedUp", "inTransit"],
          },
        },
      }),
      this.prisma.delivery.count(),
      this.prisma.riderProfile.count(),
      this.prisma.riderProfile.count({ where: { isOnline: true } }),
      this.prisma.customerProfile.count(),
      this.prisma.riderProfile.count({ where: { approvalStatus: "Pending" } }),
      this.prisma.delivery.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { include: { user: true } },
          rider: { include: { user: true } },
          payment: true,
        },
      }),
    ]);

    const totalRevenue = Number(totalRevenueResult._sum.amount || 0);

    return {
      kpis: {
        totalRevenue,
        activeDeliveries: activeDeliveriesCount,
        totalDeliveries: totalDeliveriesCount,
        totalRiders: totalRidersCount,
        onlineRiders: onlineRidersCount,
        totalCustomers: totalCustomersCount,
        pendingApprovals: pendingRiderApprovalsCount,
      },
      recentActivity: recentDeliveries.map((d) => ({
        id: d.id,
        trackingNumber: d.trackingNumber,
        customerName: d.customer.user.fullName,
        riderName: d.rider?.user.fullName || "Unassigned",
        route: `${d.pickupAddress.split(",")[0]} → ${d.dropoffAddress.split(",")[0]}`,
        status: d.status,
        amount: Number(d.totalFee),
        paymentStatus: d.payment?.status || "Pending",
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }

  async getReports() {
    // 1. Deliveries by status
    const statusCounts = await this.prisma.delivery.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    // 2. Deliveries by vehicle type
    const vehicleCounts = await this.prisma.delivery.groupBy({
      by: ["vehicleType"],
      _count: { id: true },
    });

    // 3. Top 5 riders
    const topRiders = await this.prisma.riderProfile.findMany({
      take: 5,
      orderBy: [{ rating: "desc" }, { trips: "desc" }],
      include: {
        user: true,
      },
    });

    // 4. Payments summary
    const paymentsSummary = await this.prisma.payment.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: { id: true },
    });

    return {
      deliveriesByStatus: statusCounts.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      deliveriesByVehicle: vehicleCounts.map((v) => ({
        vehicleType: v.vehicleType,
        count: v._count.id,
      })),
      topRiders: topRiders.map((r) => ({
        id: r.id,
        name: r.user.fullName,
        email: r.user.email,
        phone: r.user.phone,
        vehicleType: r.vehicleType,
        plateNumber: r.plateNumber,
        rating: Number(r.rating),
        trips: r.trips,
        approvalStatus: r.approvalStatus,
      })),
      paymentsSummary: paymentsSummary.map((p) => ({
        status: p.status,
        count: p._count.id,
        totalAmount: Number(p._sum.amount || 0),
      })),
    };
  }

  // =========================================================
  // 2. USERS MANAGEMENT
  // =========================================================

  async getUsers(role?: string, search?: string) {
    const where: any = {};
    if (role) {
      where.role = role;
    }
    if (search) {
      const term = search.trim();
      where.OR = [
        { fullName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { phone: { contains: term } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customerProfile: true,
        riderProfile: {
          include: { documents: true },
        },
        adminProfile: true,
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      fullName: u.fullName,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
      details: u.riderProfile
        ? {
            riderId: u.riderProfile.id,
            vehicleType: u.riderProfile.vehicleType,
            plateNumber: u.riderProfile.plateNumber,
            approvalStatus: u.riderProfile.approvalStatus,
            rating: Number(u.riderProfile.rating),
            trips: u.riderProfile.trips,
            isOnline: u.riderProfile.isOnline,
          }
        : u.customerProfile
          ? {
              customerId: u.customerProfile.id,
              walletBalance: Number(u.customerProfile.walletBalance),
            }
          : null,
    }));
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email.toLowerCase().trim() }, { phone: dto.phone.trim() }],
      },
    });

    if (existing) {
      throw new ConflictException("User with this email or phone already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone.trim(),
        passwordHash,
        fullName: dto.fullName.trim(),
        role: dto.role,
        status: "Active",
      },
    });

    if (dto.role === "customer") {
      await this.prisma.customerProfile.create({
        data: {
          userId: user.id,
          avatarInitials: getInitials(user.fullName),
          walletBalance: 0,
        },
      });
    } else if (dto.role === "rider") {
      await this.prisma.riderProfile.create({
        data: {
          userId: user.id,
          vehicleType: dto.vehicleType || "bike",
          plateNumber: dto.plateNumber || `RIDER-${Math.floor(1000 + Math.random() * 9000)}`,
          approvalStatus: "Approved",
          isOnline: false,
        },
      });
    } else if (dto.role === "admin") {
      await this.prisma.adminProfile.create({
        data: {
          userId: user.id,
        },
      });
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        customerProfile: {
          include: {
            deliveries: { take: 5, orderBy: { createdAt: "desc" } },
            walletTxns: { take: 5, orderBy: { createdAt: "desc" } },
          },
        },
        riderProfile: {
          include: {
            documents: true,
            deliveries: { take: 5, orderBy: { createdAt: "desc" } },
            earnings: { take: 5, orderBy: { createdAt: "desc" } },
          },
        },
        adminProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
    };
  }

  async deleteUser(id: string) {
    await this.prisma.user.delete({
      where: { id },
    });

    return { success: true, message: "User deleted successfully" };
  }

  // =========================================================
  // 3. RIDERS MANAGEMENT & KYC APPROVAL
  // =========================================================

  async getRiders(approvalStatus?: string) {
    const where: any = {};
    if (approvalStatus) {
      where.approvalStatus = approvalStatus;
    }

    const riders = await this.prisma.riderProfile.findMany({
      where,
      orderBy: { user: { createdAt: "desc" } },
      include: {
        user: true,
        documents: true,
      },
    });

    return riders.map((r) => ({
      id: r.id,
      userId: r.userId,
      fullName: r.user.fullName,
      email: r.user.email,
      phone: r.user.phone,
      vehicleType: r.vehicleType,
      plateNumber: r.plateNumber,
      rating: Number(r.rating),
      trips: r.trips,
      isOnline: r.isOnline,
      approvalStatus: r.approvalStatus,
      facePhotoUri: r.facePhotoUri,
      documentsCount: r.documents.length,
      hasExpiredDoc: r.documents.some(
        (d) => d.required && d.expiresAt && new Date(d.expiresAt) <= new Date()
      ),
      documents: r.documents.map((d) => ({
        id: d.id,
        kind: d.kind,
        label: d.label,
        required: d.required,
        uri: d.uri,
        expiresAt: d.expiresAt?.toISOString() || null,
        isVerified: d.isVerified,
      })),
    }));
  }

  async getRiderById(id: string) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { id },
      include: {
        user: true,
        documents: true,
        deliveries: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
        earnings: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!rider) {
      throw new NotFoundException("Rider not found");
    }

    return rider;
  }

  async updateRiderApproval(id: string, dto: UpdateRiderApprovalDto) {
    const rider = await this.prisma.riderProfile.update({
      where: { id },
      data: { approvalStatus: dto.status },
      include: { user: true },
    });

    return {
      id: rider.id,
      fullName: rider.user.fullName,
      approvalStatus: rider.approvalStatus,
    };
  }

  async verifyRiderDocuments(id: string) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { id },
      include: { documents: true },
    });

    if (!rider) {
      throw new NotFoundException("Rider not found");
    }

    const nextYear = new Date();
    nextYear.setDate(nextYear.getDate() + 365);

    // Verify all rider compliance documents and renew validity for +365 days
    await this.prisma.riderDocument.updateMany({
      where: { riderId: id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        expiresAt: nextYear,
      },
    });

    // Auto-approve rider
    const updated = await this.prisma.riderProfile.update({
      where: { id },
      data: { approvalStatus: "Approved" },
      include: { documents: true, user: true },
    });

    return {
      success: true,
      message: "Rider documents verified and account approved",
      rider: {
        id: updated.id,
        fullName: updated.user.fullName,
        approvalStatus: updated.approvalStatus,
        documents: updated.documents,
      },
    };
  }

  // =========================================================
  // 4. DELIVERIES MANAGEMENT & OVERRIDES
  // =========================================================

  async getDeliveries(status?: string, search?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { trackingNumber: { contains: search.trim(), mode: "insensitive" } },
        { pickupAddress: { contains: search.trim(), mode: "insensitive" } },
        { dropoffAddress: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const deliveries = await this.prisma.delivery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { include: { user: true } },
        rider: { include: { user: true } },
        payment: true,
      },
    });

    return deliveries.map((d) => ({
      id: d.id,
      trackingNumber: d.trackingNumber,
      customer: {
        id: d.customer.id,
        name: d.customer.user.fullName,
        phone: d.customer.user.phone,
      },
      rider: d.rider
        ? {
            id: d.rider.id,
            name: d.rider.user.fullName,
            phone: d.rider.user.phone,
            plateNumber: d.rider.plateNumber,
          }
        : null,
      pickupAddress: d.pickupAddress,
      dropoffAddress: d.dropoffAddress,
      packageType: d.packageType,
      vehicleType: d.vehicleType,
      distanceKm: Number(d.distanceKm),
      totalFee: Number(d.totalFee),
      status: d.status,
      paymentStatus: d.payment?.status || "Pending",
      createdAt: d.createdAt.toISOString(),
      deliveredAt: d.deliveredAt ? d.deliveredAt.toISOString() : null,
    }));
  }

  async getDeliveryById(id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: { include: { user: true } },
        rider: { include: { user: true } },
        payment: true,
      },
    });

    if (!delivery) {
      throw new NotFoundException("Delivery not found");
    }

    return delivery;
  }

  async updateDelivery(id: string, dto: UpdateDeliveryDto) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      throw new NotFoundException("Delivery not found");
    }

    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.riderId) data.riderId = dto.riderId;

    const updated = await this.prisma.delivery.update({
      where: { id },
      data,
      include: {
        rider: { include: { user: true } },
        customer: { include: { user: true } },
      },
    });

    // Broadcast status change via WebSocket
    if (dto.status) {
      this.dispatchGateway.broadcastStatusChange(id, dto.status, {
        updatedBy: "admin",
      });
    }

    return updated;
  }

  async cancelDelivery(id: string) {
    const updated = await this.prisma.delivery.update({
      where: { id },
      data: { status: "cancelled" },
    });

    this.dispatchGateway.broadcastStatusChange(id, "cancelled", {
      reason: "Cancelled by Admin",
    });

    return { success: true, message: "Delivery cancelled by admin" };
  }

  // =========================================================
  // 5. PAYMENTS MANAGEMENT
  // =========================================================

  async getPayments(status?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const payments = await this.prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        delivery: {
          include: {
            customer: { include: { user: true } },
            rider: { include: { user: true } },
          },
        },
      },
    });

    return payments.map((p) => ({
      id: p.id,
      deliveryId: p.deliveryId,
      trackingNumber: p.delivery.trackingNumber,
      customerName: p.delivery.customer.user.fullName,
      riderName: p.delivery.rider?.user.fullName || "Unassigned",
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
      status: p.status,
      transactionRef: p.transactionRef,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  async getPaymentById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        delivery: {
          include: {
            customer: { include: { user: true } },
            rider: { include: { user: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    return payment;
  }

  async updatePayment(id: string, dto: UpdatePaymentDto) {
    const payment = await this.prisma.payment.update({
      where: { id },
      data: { status: dto.status },
    });

    return payment;
  }

  // =========================================================
  // 6. TEAM MANAGEMENT
  // =========================================================

  async getTeam() {
    const admins = await this.prisma.user.findMany({
      where: { role: "admin" },
      orderBy: { createdAt: "asc" },
      include: {
        adminProfile: true,
      },
    });

    return admins.map((a) => ({
      id: a.id,
      fullName: a.fullName,
      email: a.email,
      phone: a.phone,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  async inviteTeamMember(dto: InviteTeamDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email.toLowerCase().trim() }, { phone: dto.phone.trim() }],
      },
    });

    if (existing) {
      throw new ConflictException("User with this email or phone already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone.trim(),
        passwordHash,
        fullName: dto.fullName.trim(),
        role: "admin",
        status: "Active",
        adminProfile: {
          create: {},
        },
      },
    });

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  }

  async removeTeamMember(id: string) {
    const count = await this.prisma.user.count({ where: { role: "admin" } });
    if (count <= 1) {
      throw new BadRequestException("Cannot remove the last remaining admin account");
    }

    await this.prisma.user.delete({ where: { id } });

    return { success: true, message: "Admin removed successfully" };
  }
}
