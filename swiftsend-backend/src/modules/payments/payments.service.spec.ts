import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import crypto from "crypto";
import { PaymentsService } from "./payments.service.js";
import { PrismaService } from "../../database/prisma.service.js";
import { PaymentStatus } from "@prisma/client";

describe("PaymentsService (Paystack Payment Gateway)", () => {
  let service: PaymentsService;
  let prismaMock: any;
  const webhookSecret = "test_webhook_secret_key_123";

  beforeEach(() => {
    prismaMock = {
      customerProfile: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      delivery: {
        findUnique: vi.fn(),
      },
      payment: {
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      walletTxn: {
        create: vi.fn(),
      },
      paymentWebhookEvent: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => {
        return cb(prismaMock);
      }),
    };

    const configService = {
      get: (key: string, defaultVal: string) => {
        const config: Record<string, string> = {
          PAYSTACK_SECRET_KEY: "sk_test_mock_paystack_secret_key_2026",
          PAYSTACK_PUBLIC_KEY: "pk_test_mock_paystack_public_key_2026",
          PAYSTACK_WEBHOOK_SECRET: webhookSecret,
          PAYSTACK_BASE_URL: "https://api.paystack.co",
          PAYSTACK_CALLBACK_URL: "http://localhost:5173/customer/wallet",
          PAYSTACK_MOCK: "true",
        };
        return config[key] ?? defaultVal;
      },
    } as unknown as ConfigService;

    service = new PaymentsService(prismaMock as unknown as PrismaService, configService);
  });

  describe("initializeWalletTopup", () => {
    it("should initialize topup and return mock checkout URL in test environment", async () => {
      prismaMock.customerProfile.findUnique.mockResolvedValue({
        id: "cust-1",
        user: { email: "ama@swiftsend.app", phone: "0244123456", fullName: "Ama Owusu" },
      });

      prismaMock.payment.create.mockResolvedValue({
        id: "pay-1",
        customerId: "cust-1",
        amount: 50.0,
        status: PaymentStatus.Pending,
        transactionRef: "ss_topup_mock_123",
      });

      const result = await service.initializeWalletTopup("user-1", {
        amount: 50.0,
      });

      expect(result.authorization_url).toContain("http://localhost:5173/customer/wallet");
      expect(result.reference).toBeDefined();
      expect(prismaMock.payment.create).toHaveBeenCalled();
    });
  });

  describe("verifyTransaction", () => {
    it("should verify transaction and credit customer wallet atomically", async () => {
      const mockPayment = {
        id: "pay-1",
        customerId: "cust-1",
        amount: 50.0,
        currency: "GHS",
        purpose: "wallet_topup",
        status: PaymentStatus.Pending,
        transactionRef: "ref-123",
        customer: {
          id: "cust-1",
          walletBalance: 100.0,
          user: { fullName: "Ama Owusu" },
        },
      };

      prismaMock.payment.findUnique.mockResolvedValue(mockPayment);
      prismaMock.customerProfile.findUnique.mockResolvedValue({
        id: "cust-1",
        walletBalance: 100.0,
      });
      prismaMock.customerProfile.update.mockResolvedValue({
        id: "cust-1",
        walletBalance: 150.0,
      });
      prismaMock.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.Paid,
      });

      const result = await service.verifyTransaction("ref-123");

      expect(result.verified).toBe(true);
      expect(result.walletBalance).toBe(150.0);
      expect(prismaMock.customerProfile.update).toHaveBeenCalledWith({
        where: { id: "cust-1" },
        data: { walletBalance: { increment: 50.0 } },
      });
      expect(prismaMock.walletTxn.create).toHaveBeenCalled();
    });

    it("should return early if already processed", async () => {
      prismaMock.payment.findUnique.mockResolvedValue({
        id: "pay-1",
        status: PaymentStatus.Paid,
        amount: 50.0,
        currency: "GHS",
        purpose: "wallet_topup",
        customer: { walletBalance: 200.0 },
      });

      const result = await service.verifyTransaction("ref-already-paid");
      expect(result.alreadyProcessed).toBe(true);
      expect(result.walletBalance).toBe(200.0);
    });
  });

  describe("processWebhook", () => {
    it("should reject invalid webhook signature with UnauthorizedException", async () => {
      const payload = JSON.stringify({ event: "charge.success", data: { reference: "ref-999" } });
      await expect(
        service.processWebhook("invalid_signature", payload)
      ).rejects.toThrow("Invalid webhook signature");
    });

    it("should verify valid HMAC signature and accept webhook", async () => {
      const payload = JSON.stringify({
        event: "charge.success",
        data: { reference: "ref-valid", amount: 5000, channel: "mobile_money" },
      });

      const validSignature = crypto
        .createHmac("sha512", webhookSecret)
        .update(payload)
        .digest("hex");

      prismaMock.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prismaMock.payment.findUnique.mockResolvedValue({
        id: "pay-valid",
        customerId: "cust-1",
        amount: 50.0,
        currency: "GHS",
        purpose: "wallet_topup",
        status: PaymentStatus.Pending,
        customer: { id: "cust-1", walletBalance: 20.0 },
      });

      const res = await service.processWebhook(validSignature, payload);
      expect(res.status).toBe("success");
      expect(prismaMock.paymentWebhookEvent.create).toHaveBeenCalled();
    });

    it("should idempotently ignore duplicate webhook events", async () => {
      const payload = JSON.stringify({
        event: "charge.success",
        data: { reference: "ref-duplicate" },
      });

      const validSignature = crypto
        .createHmac("sha512", webhookSecret)
        .update(payload)
        .digest("hex");

      prismaMock.paymentWebhookEvent.findUnique.mockResolvedValue({
        id: "existing-event-id",
        reference: "ref-duplicate",
      });

      const res = await service.processWebhook(validSignature, payload);
      expect(res.duplicate).toBe(true);
      expect(prismaMock.paymentWebhookEvent.create).not.toHaveBeenCalled();
    });
  });
});
