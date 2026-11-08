import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DeliveriesService } from "./deliveries.service.js";
import { EstimateDeliveryDto } from "./dto/estimate-delivery.dto.js";
import { CreateDeliveryDto } from "./dto/create-delivery.dto.js";
import { RateDeliveryDto } from "./dto/rate-delivery.dto.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";

@ApiTags("Deliveries & Customer")
@Controller()
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Post("deliveries/estimate")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Estimate delivery fare and ETA",
    description: "Calculates driving distance, ETA, base fee, distance fee, and total fare dynamically.",
  })
  @ApiResponse({ status: 200, description: "Fare calculation estimate" })
  async estimate(@Body() dto: EstimateDeliveryDto) {
    return this.deliveriesService.estimate(dto);
  }

  @Post("deliveries/request")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("customer")
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary: "Request a delivery (Customer only)",
    description: "Creates a new delivery request in 'searching' state and assigns an OTP.",
  })
  @ApiResponse({ status: 201, description: "Delivery request created" })
  async createDelivery(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateDeliveryDto
  ) {
    return this.deliveriesService.create(user.userId, dto);
  }

  @Get("customer/orders")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("customer")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Get customer order history" })
  @ApiResponse({ status: 200, description: "List of customer orders" })
  async getCustomerOrders(@CurrentUser() user: CurrentUserPayload) {
    return this.deliveriesService.getCustomerOrders(user.userId);
  }

  @Get("customer/wallet")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("customer")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Get customer wallet balance and transaction ledger" })
  @ApiResponse({ status: 200, description: "Wallet details and transaction list" })
  async getCustomerWallet(@CurrentUser() user: CurrentUserPayload) {
    return this.deliveriesService.getCustomerWallet(user.userId);
  }

  @Get("deliveries/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Get delivery details by ID (Owner, assigned rider, or admin only)" })
  @ApiResponse({ status: 200, description: "Delivery details" })
  async getDeliveryById(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.deliveriesService.findById(id, user);
  }

  @Post("deliveries/:id/rate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("customer")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Submit rating and feedback for a completed delivery" })
  @ApiResponse({ status: 200, description: "Rating submitted successfully" })
  async rateDelivery(
    @Param("id") id: string,
    @Body() dto: RateDeliveryDto,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.deliveriesService.rateDelivery(id, dto, user);
  }
}
