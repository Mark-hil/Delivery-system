import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from "@nestjs/swagger";
import type { Request } from "express";
import { PaymentsService } from "./payments.service.js";
import { InitializeTopupDto } from "./dto/initialize-topup.dto.js";
import { InitializeDeliveryPaymentDto } from "./dto/initialize-delivery-payment.dto.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";
import { UserRole } from "@prisma/client";

@ApiTags("Payments (Paystack)")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("wallet/topup/initialize")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.customer)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Initialize customer wallet top-up via Paystack" })
  @ApiResponse({ status: 201, description: "Paystack authorization URL and reference returned" })
  async initializeTopup(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: InitializeTopupDto
  ) {
    return this.paymentsService.initializeWalletTopup(user.userId, dto);
  }

  @Post("delivery/initialize")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.customer)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Initialize direct Paystack checkout for delivery order" })
  @ApiResponse({ status: 201, description: "Paystack authorization URL and reference returned" })
  async initializeDeliveryPayment(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: InitializeDeliveryPaymentDto
  ) {
    return this.paymentsService.initializeDeliveryPayment(user.userId, dto);
  }

  @Get("verify/:reference")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Verify a Paystack transaction reference and settle wallet/delivery" })
  @ApiResponse({ status: 200, description: "Payment status verified and balance updated" })
  async verifyPayment(
    @Param("reference") reference: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.paymentsService.verifyTransaction(reference, user);
  }

  @Get("history")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.customer)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Get customer payment transactions history" })
  @ApiResponse({ status: 200, description: "List of payment transactions" })
  async getPaymentHistory(@CurrentUser() user: CurrentUserPayload) {
    return this.paymentsService.getCustomerPayments(user.userId);
  }

  @Post("paystack/webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Paystack automated webhook handler (HMAC SHA512 verified)" })
  @ApiHeader({ name: "x-paystack-signature", description: "HMAC SHA512 signature computed with secret key" })
  @ApiResponse({ status: 200, description: "Webhook received and idempotently processed" })
  async handlePaystackWebhook(
    @Headers("x-paystack-signature") signature: string,
    @Req() req: Request
  ) {
    // Strictly requires the unparsed rawBody buffer provided by NestFactory { rawBody: true }
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    return this.paymentsService.processWebhook(signature, rawBody);
  }
}
