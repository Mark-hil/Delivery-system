import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { RiderService } from "./rider.service.js";
import { CompleteJobDto } from "./dto/complete-job.dto.js";
import { ToggleStatusDto } from "./dto/toggle-status.dto.js";
import { ResubmitDocumentsDto } from "./dto/resubmit-documents.dto.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";

@ApiTags("Rider Operations")
@Controller("rider")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("rider")
@ApiBearerAuth("access-token")
export class RiderController {
  constructor(private readonly riderService: RiderService) {}

  @Post("jobs/:id/accept")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Accept an available delivery job",
    description:
      "Atomic job acceptance using database conditional update to eliminate race conditions between multiple riders.",
  })
  @ApiResponse({ status: 200, description: "Job accepted successfully" })
  @ApiResponse({
    status: 409,
    description: "Job already accepted by another rider or no longer available",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Required documents have expired",
  })
  async acceptJob(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") deliveryId: string
  ) {
    return this.riderService.acceptJob(user.userId, deliveryId);
  }

  @Post("jobs/:id/pickup")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirm package collected from pickup location" })
  @ApiResponse({ status: 200, description: "Pickup confirmed" })
  async confirmPickup(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") deliveryId: string
  ) {
    return this.riderService.confirmPickup(user.userId, deliveryId);
  }

  @Post("jobs/:id/complete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Complete delivery with receiver's 4-digit OTP",
    description: "Validates proof-of-delivery code and credits rider earnings atomically.",
  })
  @ApiResponse({ status: 200, description: "Delivery successfully completed" })
  @ApiResponse({ status: 400, description: "Invalid OTP code" })
  async completeDelivery(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") deliveryId: string,
    @Body() dto: CompleteJobDto
  ) {
    return this.riderService.completeDelivery(user.userId, deliveryId, dto.otp);
  }

  @Get("earnings")
  @ApiOperation({ summary: "Get rider earnings summary and recent history" })
  @ApiResponse({ status: 200, description: "Earnings summary" })
  async getEarnings(@CurrentUser() user: CurrentUserPayload) {
    return this.riderService.getEarnings(user.userId);
  }

  @Patch("status")
  @ApiOperation({ summary: "Toggle rider online / offline availability" })
  @ApiResponse({ status: 200, description: "Updated availability" })
  async toggleOnlineStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ToggleStatusDto
  ) {
    return this.riderService.toggleOnlineStatus(user.userId, dto.isOnline);
  }

  @Post("documents")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Resubmit expired or updated compliance documents",
    description: "Renews required documents for 1 year and returns updated RiderUser.",
  })
  @ApiResponse({ status: 200, description: "Documents updated" })
  async resubmitDocuments(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ResubmitDocumentsDto
  ) {
    return this.riderService.resubmitDocuments(user.userId, dto);
  }
}
