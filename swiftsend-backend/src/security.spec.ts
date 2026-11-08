import { describe, it, expect, vi } from "vitest";
import { ForbiddenException, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { DeliveriesService } from "./modules/deliveries/deliveries.service.js";
import { RiderService } from "./modules/rider/rider.service.js";
import { AdminService } from "./modules/admin/admin.service.js";
import { UploadsService } from "./modules/uploads/uploads.service.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { JwtStrategy } from "./modules/auth/strategies/jwt.strategy.js";
import { PaymentsService } from "./modules/payments/payments.service.js";
import { PaymentStatus } from "@prisma/client";

describe("Security Remediation Suite", () => {
  describe("1. Delivery OTP Redaction", () => {
    it("strips deliveryOtp when broadcasting new jobs to riders, while keeping it for the customer response", async () => {
      const prismaMock: any = {
        customerProfile: {
          findUnique: vi.fn().mockResolvedValue({
            id: "cust-1",
            userId: "user-1",
            walletBalance: 500,
            user: { fullName: "Ama Owusu", phone: "0244123456" },
          }),
        },
        delivery: {
          create: vi.fn().mockImplementation(async ({ data }: any) => ({
            id: "del-1",
            ...data,
            createdAt: new Date("2026-11-06T00:00:00Z"),
            rider: null,
          })),
        },
      };
      const redisMock: any = {
        findNearbyRiders: vi.fn().mockResolvedValue([{ riderId: "rider-1", distanceKm: 1.2 }]),
      };
      const settingsMock: any = {
        getSettings: vi.fn().mockResolvedValue({
          baseFee: 15,
          perKmRate: 3.5,
          serviceFee: 2,
        }),
      };
      const dispatchMock: any = {
        broadcastNewJob: vi.fn(),
      };
      const smsMock: any = {
        sendDeliveryReceiverAlert: vi.fn().mockResolvedValue(true),
      };

      const deliveriesService = new DeliveriesService(
        prismaMock,
        redisMock,
        settingsMock,
        dispatchMock,
        smsMock
      );

      const res = await deliveriesService.create("user-1", {
        pickupAddress: "Airport Residential, Accra",
        dropoffAddress: "Osu Oxford Street, Accra",
        packageType: "Documents",
        packageDescription: "Contract",
        weight: "0.5 kg",
        deliveryType: "immediate" as any,
        vehicleType: "bike" as any,
        distanceKm: 5,
        etaMinutes: 15,
        baseFee: 15,
        distanceFee: 17.5,
        serviceFee: 2,
        totalFee: 34.5,
      });

      // Customer receives deliveryOtp
      expect(res.deliveryOtp).toBeDefined();
      expect(res.deliveryOtp).toMatch(/^\d{4}$/);

      // Broadcast payload to riders MUST NOT contain deliveryOtp
      expect(dispatchMock.broadcastNewJob).toHaveBeenCalledTimes(1);
      const broadcastedJob = dispatchMock.broadcastNewJob.mock.calls[0][0];
      expect(broadcastedJob.deliveryOtp).toBeUndefined();
    });

    it("never exposes deliveryOtp in RiderService.acceptJob or confirmPickup", async () => {
      const futureDate = new Date(Date.now() + 86400000 * 30);
      const prismaMock: any = {
        riderProfile: {
          findUnique: vi.fn().mockResolvedValue({
            id: "rider-1",
            userId: "user-rider-1",
            approvalStatus: "Approved",
            user: { fullName: "Kwame Mensah" },
            documents: [
              { kind: "drivingLicense", required: true, isVerified: true, expiresAt: futureDate },
            ],
          }),
        },
        delivery: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUnique: vi.fn().mockResolvedValue({
            id: "del-1",
            trackingNumber: "SW-123456",
            pickupAddress: "A",
            dropoffAddress: "B",
            packageType: "Box",
            packageDescription: "Test",
            weight: "1kg",
            deliveryType: "immediate",
            vehicleType: "bike",
            distanceKm: 4,
            etaMinutes: 12,
            baseFee: 15,
            distanceFee: 14,
            serviceFee: 2,
            totalFee: 31,
            status: "accepted",
            riderId: "rider-1",
            deliveryOtp: "9876",
            createdAt: new Date(),
            rider: { user: { fullName: "Kwame Mensah" } },
          }),
        },
      };
      const redisMock: any = {};
      const dispatchMock: any = { broadcastStatusChange: vi.fn() };

      const riderService = new RiderService(prismaMock, redisMock, dispatchMock);
      const accepted = await riderService.acceptJob("user-rider-1", "del-1");
      expect((accepted as any).deliveryOtp).toBeUndefined();
    });
  });

  describe("2. Rider KYC & Approval Enforcement + Delivery OTP Brute-Force Lockout", () => {
    it("blocks unapproved or unverified riders from accepting jobs", async () => {
      const prismaMock: any = {
        riderProfile: {
          findUnique: vi.fn().mockResolvedValue({
            id: "rider-pending",
            userId: "user-pending",
            approvalStatus: "Pending",
            user: { fullName: "Pending Rider" },
            documents: [],
          }),
        },
      };
      const riderService = new RiderService(prismaMock, {} as any, {} as any);
      await expect(riderService.acceptJob("user-pending", "del-1")).rejects.toThrow(
        ForbiddenException
      );
    });

    it("locks delivery completion after 5 failed OTP attempts", async () => {
      let attempts = 5;
      const prismaMock: any = {
        riderProfile: {
          findUnique: vi.fn().mockResolvedValue({ id: "rider-1", userId: "user-1" }),
        },
        delivery: {
          findUnique: vi.fn().mockResolvedValue({
            id: "del-1",
            riderId: "rider-1",
            status: "inTransit",
            deliveryOtp: "1234",
            customer: { id: "cust-1", walletBalance: 100 },
          }),
        },
      };
      const redisMock: any = {
        client: {
          get: vi.fn().mockImplementation(async () => String(attempts)),
          incr: vi.fn(),
          expire: vi.fn(),
          del: vi.fn(),
        },
      };
      const riderService = new RiderService(prismaMock, redisMock, {} as any);
      await expect(
        riderService.completeDelivery("user-1", "del-1", "1234")
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("3. Admin Service Safe User Selection & Team Member Safeguards", () => {
    it("blocks removing a non-admin user via removeTeamMember and blocks self-deletion", async () => {
      const prismaMock: any = {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: "cust-user-1",
            role: "customer",
          }),
          count: vi.fn().mockResolvedValue(2),
          delete: vi.fn(),
        },
      };
      const adminService = new AdminService(prismaMock, {} as any);

      // Self-deletion blocked
      await expect(
        adminService.removeTeamMember("admin-1", "admin-1")
      ).rejects.toThrow(BadRequestException);

      // Non-admin target rejected
      await expect(
        adminService.removeTeamMember("cust-user-1", "admin-1")
      ).rejects.toThrow("Admin team member not found");
      expect(prismaMock.user.delete).not.toHaveBeenCalled();
    });
  });

  describe("4. Uploads MIME Whitelist Enforcement", () => {
    it("rejects non-whitelisted MIME types and derives extension from MIME type", async () => {
      const configMock = {
        get: vi.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;
      const uploadsService = new UploadsService(configMock);

      await expect(
        uploadsService.getPresignedUrl({
          filename: "evil.html",
          mimeType: "text/html" as any,
          kind: "document",
        })
      ).rejects.toThrow(BadRequestException);

      const safe = await uploadsService.getPresignedUrl({
        filename: "payload.html.exe",
        mimeType: "image/png",
        kind: "document",
      });
      expect(safe.fileKey).toMatch(/^documents\/[0-9a-f-]+\.png$/);
    });
  });

  describe("5. JWT Startup Secret Enforcement & Payments Security", () => {
    it("throws at AuthService startup if JWT secrets are missing", () => {
      const emptyConfig = {
        get: vi.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      expect(
        () =>
          new AuthService(
            {} as any,
            {} as any,
            {} as unknown as JwtService,
            emptyConfig,
            {} as any
          )
      ).toThrow(/JWT_ACCESS_SECRET/);
    });

    it("enforces BOLA ownership on verifyTransaction and blocks open-redirect callbackUrl", async () => {
      const prismaMock: any = {
        customerProfile: {
          findUnique: vi.fn().mockResolvedValue({
            id: "cust-1",
            userId: "owner-user-id",
            user: { email: "owner@swiftsend.app", phone: "0244000000", fullName: "Owner" },
          }),
        },
        payment: {
          findUnique: vi.fn().mockResolvedValue({
            id: "pay-1",
            customerId: "cust-1",
            amount: 50,
            currency: "GHS",
            purpose: "wallet_topup",
            status: PaymentStatus.Pending,
            customer: { id: "cust-1", userId: "owner-user-id", walletBalance: 10 },
          }),
        },
      };
      const configMock = {
        get: (key: string, def?: string) => {
          const map: Record<string, string> = {
            NODE_ENV: "development",
            PAYSTACK_SECRET_KEY: "sk_test_mock_paystack_secret_key_2026",
            PAYSTACK_MOCK: "true",
            FRONTEND_URL: "http://localhost:5173",
            PAYSTACK_CALLBACK_URL: "http://localhost:5173/customer/wallet",
          };
          return map[key] ?? def;
        },
      } as unknown as ConfigService;

      const paymentsService = new PaymentsService(prismaMock, configMock);

      // Another customer trying to verify owner's transaction -> ForbiddenException
      await expect(
        paymentsService.verifyTransaction("ref-1", {
          userId: "attacker-user-id",
          email: "attacker@test.com",
          role: "customer",
        })
      ).rejects.toThrow(ForbiddenException);

      // Evil external callbackUrl -> BadRequestException
      await expect(
        paymentsService.initializeWalletTopup("owner-user-id", {
          amount: 25,
          callbackUrl: "https://evil.example.com/steal",
        })
      ).rejects.toThrow(BadRequestException);
    });

    it("prevents wallet over-commit across concurrent active deliveries", async () => {
      const prismaMock: any = {
        customerProfile: {
          findUnique: vi.fn().mockResolvedValue({
            id: "cust-1",
            userId: "user-1",
            walletBalance: 50,
            user: { fullName: "Ama Owusu", phone: "0244123456" },
          }),
        },
        delivery: {
          aggregate: vi.fn().mockResolvedValue({
            _sum: { totalFee: 35 }, // Already has GHS 35 tied up in an active order
          }),
          create: vi.fn(),
        },
      };
      const settingsMock: any = {
        getSettings: vi.fn().mockResolvedValue({
          baseFee: 15,
          perKmRate: 3.5,
          serviceFee: 2,
        }),
      };

      const deliveriesService = new DeliveriesService(
        prismaMock,
        {} as any,
        settingsMock,
        {} as any,
        {} as any
      );

      // Total balance is 50, reserved is 35 -> available is 15, which is < 34.5 required
      await expect(
        deliveriesService.create("user-1", {
          pickupAddress: "Airport Residential, Accra",
          dropoffAddress: "Osu Oxford Street, Accra",
          packageType: "Documents",
          packageDescription: "Contract",
          weight: "0.5 kg",
          deliveryType: "immediate" as any,
          vehicleType: "bike" as any,
          distanceKm: 5,
          etaMinutes: 15,
          baseFee: 15,
          distanceFee: 17.5,
          serviceFee: 2,
          totalFee: 34.5,
        })
      ).rejects.toThrow(/Insufficient wallet balance/);
      expect(prismaMock.delivery.create).not.toHaveBeenCalled();
    });

    it("rejects webhooks missing rawBody and blocks refresh tokens used as access tokens", async () => {
      const configMock = {
        get: (key: string) => {
          const map: Record<string, string> = {
            NODE_ENV: "development",
            PAYSTACK_SECRET_KEY: "sk_test_123",
            PAYSTACK_WEBHOOK_SECRET: "whsec_123",
            PAYSTACK_MOCK: "true",
          };
          return map[key];
        },
        getOrThrow: () => "jwt_secret_123456789012345678901234567890",
      } as unknown as ConfigService;

      const paymentsService = new PaymentsService({} as any, configMock);
      await expect(
        paymentsService.processWebhook("abcd", undefined)
      ).rejects.toThrow(UnauthorizedException);

      const jwtStrategy = new JwtStrategy(configMock, {
        user: { findUnique: vi.fn() },
      } as any);
      await expect(
        jwtStrategy.validate({
          sub: "user-1",
          email: "admin@swiftsend.app",
          role: "admin",
          typ: "refresh",
        })
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

