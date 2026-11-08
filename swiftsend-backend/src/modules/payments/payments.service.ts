import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import crypto from "crypto";
import { PrismaService } from "../../database/prisma.service.js";
import { InitializeTopupDto } from "./dto/initialize-topup.dto.js";
import { InitializeDeliveryPaymentDto } from "./dto/initialize-delivery-payment.dto.js";
import { PaymentStatus } from "@prisma/client";
import type { CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";

export interface PaystackInitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly secretKey: string;
  private readonly publicKey: string;
  private readonly webhookSecret: string;
  private readonly baseUrl: string;
  private readonly defaultCallbackUrl: string;
  private readonly isMock: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {
    const nodeEnv = this.config.get<string>("NODE_ENV") ?? "";
    this.secretKey = this.config.get<string>("PAYSTACK_SECRET_KEY") ?? "";
    this.publicKey = this.config.get<string>("PAYSTACK_PUBLIC_KEY") ?? "";
    this.webhookSecret =
      this.config.get<string>("PAYSTACK_WEBHOOK_SECRET") || this.secretKey;
    this.baseUrl = this.config.get<string>("PAYSTACK_BASE_URL") ?? "";
    this.defaultCallbackUrl =
      this.config.get<string>("PAYSTACK_CALLBACK_URL") ?? "";

    const isMockKey =
      this.config.get<string>("PAYSTACK_MOCK") === "true" || !this.secretKey;

    if (nodeEnv === "production" && (!this.secretKey || isMockKey)) {
      throw new Error(
        "CRITICAL: Production environment requires a live PAYSTACK_SECRET_KEY (mock mode is forbidden)"
      );
    }

    this.isMock = nodeEnv !== "production" && isMockKey;
  }

  private resolveSafeCallbackUrl(customUrl?: string): string {
    if (!customUrl) return this.defaultCallbackUrl;
    try {
      const allowedOrigin = new URL(
        this.config.get<string>("FRONTEND_URL") || this.defaultCallbackUrl
      ).origin;
      const candidateOrigin = new URL(customUrl).origin;
      if (candidateOrigin === allowedOrigin) {
        return customUrl;
      }
    } catch {
      // Invalid URL falls back to defaultCallbackUrl
    }
    throw new BadRequestException("Callback URL must match the trusted frontend origin");
  }

  /**
   * 1. INITIALIZE WALLET TOP-UP VIA PAYSTACK
   */
  async initializeWalletTopup(
    userId: string,
    dto: InitializeTopupDto
  ): Promise<PaystackInitResponse> {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!customer) {
      throw new NotFoundException("Customer profile not found");
    }

    const reference = `ss_topup_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const callbackUrl = this.resolveSafeCallbackUrl(dto.callbackUrl);

    // Create pending Payment record in database
    const payment = await this.prisma.payment.create({
      data: {
        customerId: customer.id,
        amount: dto.amount,
        currency: "GHS",
        purpose: "wallet_topup",
        paymentMethod: "mobile_money",
        status: PaymentStatus.Pending,
        transactionRef: reference,
        metadata: {
          customerEmail: customer.user.email,
          customerPhone: customer.user.phone,
          customerName: customer.user.fullName,
        },
      },
    });

    // If sandbox / test mock environment, return simulated Paystack checkout
    if (this.isMock) {
      this.logger.log(
        `[PAYSTACK MOCK INIT] Top-up GHS ${dto.amount} for ${customer.user.email} (Ref: ${reference})`
      );
      const mockAccessCode = `mock_acc_${reference}`;
      const mockAuthUrl = `${callbackUrl}?reference=${reference}&status=success`;

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { paystackAccessCode: mockAccessCode },
      });

      return {
        authorization_url: mockAuthUrl,
        access_code: mockAccessCode,
        reference,
      };
    }

    // Call official Paystack API: POST /transaction/initialize
    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: customer.user.email,
          amount: Math.round(dto.amount * 100), // Pesewas
          currency: "GHS",
          reference,
          callback_url: callbackUrl,
          channels: ["mobile_money", "card"],
          metadata: {
            paymentId: payment.id,
            customerId: customer.id,
            purpose: "wallet_topup",
          },
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.status) {
        throw new BadRequestException(
          resData.message || "Failed to initialize Paystack transaction"
        );
      }

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { paystackAccessCode: resData.data.access_code },
      });

      return {
        authorization_url: resData.data.authorization_url,
        access_code: resData.data.access_code,
        reference,
      };
    } catch (err: any) {
      this.logger.error(`Paystack initialization error: ${err.message}`, err.stack);
      throw new BadRequestException(err.message || "Paystack connection error");
    }
  }

  /**
   * 2. INITIALIZE DIRECT DELIVERY CHECKOUT
   */
  async initializeDeliveryPayment(
    userId: string,
    dto: InitializeDeliveryPaymentDto
  ): Promise<PaystackInitResponse> {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!customer) {
      throw new NotFoundException("Customer profile not found");
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: dto.deliveryId },
      include: { payment: true },
    });

    if (!delivery) {
      throw new NotFoundException("Delivery not found");
    }

    if (delivery.customerId !== customer.id) {
      throw new UnauthorizedException("Delivery does not belong to you");
    }

    if (delivery.payment?.status === PaymentStatus.Paid) {
      throw new BadRequestException("This delivery has already been paid for");
    }

    const reference = `ss_del_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const callbackUrl = this.resolveSafeCallbackUrl(dto.callbackUrl);
    const amount = Number(delivery.totalFee);

    // Create or update payment record
    const payment = delivery.payment
      ? await this.prisma.payment.update({
          where: { id: delivery.payment.id },
          data: {
            transactionRef: reference,
            amount,
            status: PaymentStatus.Pending,
            purpose: "delivery_fee",
          },
        })
      : await this.prisma.payment.create({
          data: {
            deliveryId: delivery.id,
            customerId: customer.id,
            amount,
            currency: "GHS",
            purpose: "delivery_fee",
            paymentMethod: "mobile_money",
            status: PaymentStatus.Pending,
            transactionRef: reference,
          },
        });

    if (this.isMock) {
      const mockAccessCode = `mock_acc_${reference}`;
      const mockAuthUrl = `${callbackUrl}?reference=${reference}&status=success`;

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { paystackAccessCode: mockAccessCode },
      });

      return {
        authorization_url: mockAuthUrl,
        access_code: mockAccessCode,
        reference,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: customer.user.email,
          amount: Math.round(amount * 100),
          currency: "GHS",
          reference,
          callback_url: callbackUrl,
          channels: ["mobile_money", "card"],
          metadata: {
            paymentId: payment.id,
            deliveryId: delivery.id,
            customerId: customer.id,
            purpose: "delivery_fee",
          },
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.status) {
        throw new BadRequestException(
          resData.message || "Failed to initialize Paystack transaction"
        );
      }

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { paystackAccessCode: resData.data.access_code },
      });

      return {
        authorization_url: resData.data.authorization_url,
        access_code: resData.data.access_code,
        reference,
      };
    } catch (err: any) {
      this.logger.error(`Paystack init error: ${err.message}`, err.stack);
      throw new BadRequestException(err.message || "Paystack connection error");
    }
  }

  /**
   * 3. VERIFY PAYSTACK TRANSACTION & IDEMPOTENTLY SETTLE WALLET/ORDER
   */
  async verifyTransaction(reference: string, caller?: CurrentUserPayload) {
    const payment = await this.prisma.payment.findUnique({
      where: { transactionRef: reference },
      include: {
        customer: {
          include: { user: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment transaction reference not found");
    }

    // BOLA / IDOR Check: Only the payment owner or an admin may verify via HTTP
    if (caller && caller.role !== "admin") {
      if (!payment.customer || payment.customer.userId !== caller.userId) {
        throw new ForbiddenException("You do not have permission to verify this payment");
      }
    }

    // If already settled, return current state
    if (payment.status === PaymentStatus.Paid) {
      return {
        verified: true,
        alreadyProcessed: true,
        status: payment.status,
        amount: Number(payment.amount),
        currency: payment.currency,
        purpose: payment.purpose,
        walletBalance: payment.customer ? Number(payment.customer.walletBalance) : 0,
      };
    }

    let isSuccess = false;
    let channel = "mobile_money";
    let paidAmount = Number(payment.amount);

    if (this.isMock) {
      // In simulator, automatically treat reference as verified
      isSuccess = true;
      channel = "mobile_money (mock)";
    } else {
      try {
        const response = await fetch(
          `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.secretKey}`,
            },
          }
        );

        const data = await response.json();
        if (response.ok && data.status && data.data.status === "success") {
          const verifiedAmount = data.data.amount / 100; // Pesewas to Cedis
          const expectedAmount = Number(payment.amount);
          if (
            data.data.currency !== payment.currency ||
            Math.abs(verifiedAmount - expectedAmount) > 0.01
          ) {
            this.logger.error(
              `Paystack amount/currency mismatch for ${reference}: expected ${payment.currency} ${expectedAmount}, got ${data.data.currency} ${verifiedAmount}`
            );
            throw new BadRequestException("Payment amount or currency mismatch");
          }
          isSuccess = true;
          channel = data.data.channel || "card";
          paidAmount = verifiedAmount;
        } else {
          this.logger.warn(`Paystack verification failed for ${reference}: ${data.message}`);
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.Failed },
          });
          return {
            verified: false,
            status: PaymentStatus.Failed,
            message: data.message || "Payment verification failed",
          };
        }
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        this.logger.error(`Error querying Paystack verification: ${err.message}`);
        throw new BadRequestException("Failed to verify transaction with Paystack");
      }
    }

    if (!isSuccess) {
      return { verified: false, status: payment.status };
    }

    // Atomic database transaction to prevent double credit / race conditions
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Atomically transition status from non-Paid -> Paid
      if (tx.payment.updateMany) {
        const claim = await tx.payment.updateMany({
          where: {
            id: payment.id,
            status: { not: PaymentStatus.Paid },
          },
          data: {
            status: PaymentStatus.Paid,
            paidAt: new Date(),
            paymentMethod: channel,
          },
        });
        if (claim.count === 0) {
          const latestCustomer = payment.customerId
            ? await tx.customerProfile.findUnique({ where: { id: payment.customerId } })
            : null;
          return {
            alreadySettled: true,
            walletBalance: latestCustomer ? Number(latestCustomer.walletBalance) : 0,
          };
        }
      } else {
        const current = await tx.payment.findUnique({
          where: { id: payment.id },
        });
        if (!current || current.status === PaymentStatus.Paid) {
          return { alreadySettled: true, walletBalance: 0 };
        }
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.Paid,
            paidAt: new Date(),
            paymentMethod: channel,
          },
        });
      }

      let updatedBalance = 0;

      // 2. If Wallet Top-up, atomically credit customer balance & write ledger
      if (payment.purpose === "wallet_topup" && payment.customerId) {
        const updatedCustomer = await tx.customerProfile.update({
          where: { id: payment.customerId },
          data: {
            walletBalance: { increment: paidAmount },
          },
        });

        const newBal =
          updatedCustomer?.walletBalance !== undefined
            ? Number(updatedCustomer.walletBalance)
            : Number(payment.customer?.walletBalance ?? 0) + paidAmount;

        await tx.walletTxn.create({
          data: {
            customerId: payment.customerId,
            label: `Top-up via Paystack (${channel})`,
            amount: paidAmount,
            balance: newBal,
          },
        });

        updatedBalance = newBal;
      }

      return {
        alreadySettled: false,
        walletBalance: updatedBalance,
      };
    });

    return {
      verified: true,
      alreadyProcessed: result.alreadySettled || undefined,
      status: PaymentStatus.Paid,
      amount: paidAmount,
      currency: payment.currency,
      purpose: payment.purpose,
      walletBalance: result.walletBalance,
    };
  }

  /**
   * 4. SECURE PAYSTACK WEBHOOK PROCESSOR (HMAC SHA512 Verified & Idempotent)
   */
  async processWebhook(signature: string, rawBody?: Buffer | string) {
    if (!signature || !this.webhookSecret || !rawBody) {
      throw new UnauthorizedException("Missing x-paystack-signature header or raw webhook payload");
    }

    // Verify HMAC SHA512 using constant-time comparison over exact raw payload
    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
    if (!bodyStr) {
      throw new UnauthorizedException("Empty webhook payload");
    }
    const computedHash = crypto
      .createHmac("sha512", this.webhookSecret)
      .update(bodyStr)
      .digest("hex");

    const sigBuf = Buffer.from(signature.trim(), "utf8");
    const hashBuf = Buffer.from(computedHash, "utf8");
    if (sigBuf.length !== hashBuf.length || !crypto.timingSafeEqual(sigBuf, hashBuf)) {
      this.logger.error("Paystack webhook signature verification failed!");
      throw new UnauthorizedException("Invalid webhook signature");
    }

    const payload = JSON.parse(bodyStr);
    const event = payload.event;
    const data = payload.data;
    const reference = data?.reference;

    if (!reference) {
      return { status: "ignored", reason: "Missing reference in webhook payload" };
    }

    // Idempotency Gate: Check if event has already been recorded
    const existingEvent = await this.prisma.paymentWebhookEvent.findUnique({
      where: { reference },
    });

    if (existingEvent) {
      this.logger.log(`[PAYSTACK WEBHOOK] Ignoring already processed event for ${reference}`);
      return { status: "success", duplicate: true };
    }

    // Store webhook event for audit trail
    await this.prisma.paymentWebhookEvent.create({
      data: {
        event,
        reference,
        payload,
      },
    });

    if (event === "charge.success") {
      this.logger.log(`[PAYSTACK WEBHOOK] Settle charge.success for ref: ${reference}`);
      await this.verifyTransaction(reference);
    }

    return { status: "success" };
  }

  /**
   * 5. GET CUSTOMER PAYMENT HISTORY
   */
  async getCustomerPayments(userId: string) {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (!customer) {
      throw new NotFoundException("Customer profile not found");
    }

    const payments = await this.prisma.payment.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      include: {
        delivery: {
          select: {
            trackingNumber: true,
            pickupAddress: true,
            dropoffAddress: true,
          },
        },
      },
    });

    return payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      purpose: p.purpose,
      method: p.paymentMethod,
      status: p.status,
      reference: p.transactionRef,
      deliveryTracking: p.delivery?.trackingNumber,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
    }));
  }
}
