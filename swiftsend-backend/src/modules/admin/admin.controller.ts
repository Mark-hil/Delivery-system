import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";
import { AdminService } from "./admin.service.js";
import { ComplianceService } from "./compliance.service.js";
import { CreateUserDto } from "./dto/create-user.dto.js";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto.js";
import { UpdateRiderApprovalDto } from "./dto/update-rider-approval.dto.js";
import { UpdateDeliveryDto } from "./dto/update-delivery.dto.js";
import { UpdatePaymentDto } from "./dto/update-payment.dto.js";
import { InviteTeamDto } from "./dto/invite-team.dto.js";

@ApiTags("Admin Portal & Operations")
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
@ApiBearerAuth("access-token")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly complianceService: ComplianceService
  ) {}

  // ---------------------------------------------------------
  // 1. OVERVIEW & ANALYTICS
  // ---------------------------------------------------------

  @Get("overview")
  @ApiOperation({ summary: "Get platform KPI cards and recent activity" })
  @ApiResponse({ status: 200, description: "Platform overview metrics" })
  async getOverview() {
    return this.adminService.getOverview();
  }

  @Get("reports")
  @ApiOperation({ summary: "Get aggregated analytics reports and top performers" })
  @ApiResponse({ status: 200, description: "Detailed platform reports" })
  async getReports() {
    return this.adminService.getReports();
  }

  @Post("compliance/check")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Trigger manual compliance document audit" })
  @ApiResponse({ status: 200, description: "Compliance audit summary" })
  async runComplianceAudit() {
    return this.complianceService.runComplianceCheck();
  }

  // ---------------------------------------------------------
  // 2. USERS MANAGEMENT
  // ---------------------------------------------------------

  @Get("users")
  @ApiOperation({ summary: "List all users (optional role and search filters)" })
  @ApiQuery({ name: "role", required: false, description: "Optional role filter (customer, rider, admin)" })
  @ApiQuery({ name: "search", required: false, description: "Optional name, email, or phone search" })
  async getUsers(
    @Query("role") role?: string,
    @Query("search") search?: string
  ) {
    return this.adminService.getUsers(role, search);
  }

  @Get("users/all")
  @ApiOperation({ summary: "Get all users with no query parameters" })
  async getAllUsers() {
    return this.adminService.getUsers();
  }

  @Post("users")
  @ApiOperation({ summary: "Create a new customer, rider, or admin account" })
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Get("users/:id")
  @ApiOperation({ summary: "Get full user profile by ID" })
  async getUserById(@Param("id") id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch("users/:id/status")
  @ApiOperation({ summary: "Toggle user account status (Active / Suspended)" })
  async updateUserStatus(
    @Param("id") id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.adminService.updateUserStatus(id, dto, user.userId);
  }

  @Delete("users/:id")
  @ApiOperation({ summary: "Delete user account" })
  async deleteUser(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.adminService.deleteUser(id, user.userId);
  }

  // ---------------------------------------------------------
  // 3. RIDERS MANAGEMENT & KYC APPROVAL
  // ---------------------------------------------------------

  @Get("riders")
  @ApiOperation({ summary: "List all riders with documents and status" })
  @ApiQuery({ name: "approvalStatus", required: false, description: "Optional status filter (Pending, Approved, Suspended)" })
  async getRiders(@Query("approvalStatus") approvalStatus?: string) {
    return this.adminService.getRiders(approvalStatus);
  }

  @Get("riders/:id")
  @ApiOperation({ summary: "Get rider details and uploaded documents" })
  async getRiderById(@Param("id") id: string) {
    return this.adminService.getRiderById(id);
  }

  @Patch("riders/:id/approval")
  @ApiOperation({ summary: "Set rider approval status (Pending / Approved / Suspended)" })
  async updateRiderApproval(
    @Param("id") id: string,
    @Body() dto: UpdateRiderApprovalDto
  ) {
    return this.adminService.updateRiderApproval(id, dto);
  }

  @Post("riders/:id/verify-documents")
  @ApiOperation({ summary: "Approve all rider documents and grant +365 days validity" })
  async verifyRiderDocuments(@Param("id") id: string) {
    return this.adminService.verifyRiderDocuments(id);
  }

  // ---------------------------------------------------------
  // 4. DELIVERIES MANAGEMENT & OVERRIDES
  // ---------------------------------------------------------

  @Get("deliveries")
  @ApiOperation({ summary: "List all deliveries with status and search filter" })
  @ApiQuery({ name: "status", required: false, description: "Optional delivery status filter" })
  @ApiQuery({ name: "search", required: false, description: "Optional search filter" })
  async getDeliveries(
    @Query("status") status?: string,
    @Query("search") search?: string
  ) {
    return this.adminService.getDeliveries(status, search);
  }

  @Get("deliveries/:id")
  @ApiOperation({ summary: "Get delivery details by ID" })
  async getDeliveryById(@Param("id") id: string) {
    return this.adminService.getDeliveryById(id);
  }

  @Patch("deliveries/:id")
  @ApiOperation({ summary: "Update delivery status or manually reassign rider" })
  async updateDelivery(
    @Param("id") id: string,
    @Body() dto: UpdateDeliveryDto
  ) {
    return this.adminService.updateDelivery(id, dto);
  }

  @Delete("deliveries/:id")
  @ApiOperation({ summary: "Cancel delivery" })
  async cancelDelivery(@Param("id") id: string) {
    return this.adminService.cancelDelivery(id);
  }

  // ---------------------------------------------------------
  // 5. PAYMENTS MANAGEMENT
  // ---------------------------------------------------------

  @Get("payments")
  @ApiOperation({ summary: "List payment ledger records" })
  @ApiQuery({ name: "status", required: false, description: "Optional payment status filter (Paid, Pending, Failed)" })
  async getPayments(@Query("status") status?: string) {
    return this.adminService.getPayments(status);
  }

  @Get("payments/:id")
  @ApiOperation({ summary: "Get payment record details" })
  async getPaymentById(@Param("id") id: string) {
    return this.adminService.getPaymentById(id);
  }

  @Patch("payments/:id")
  @ApiOperation({ summary: "Update payment status" })
  async updatePayment(
    @Param("id") id: string,
    @Body() dto: UpdatePaymentDto
  ) {
    return this.adminService.updatePayment(id, dto);
  }

  // ---------------------------------------------------------
  // 6. TEAM MANAGEMENT
  // ---------------------------------------------------------

  @Get("team")
  @ApiOperation({ summary: "List admin team members" })
  async getTeam() {
    return this.adminService.getTeam();
  }

  @Post("team")
  @ApiOperation({ summary: "Invite new admin team member" })
  async inviteTeamMember(@Body() dto: InviteTeamDto) {
    return this.adminService.inviteTeamMember(dto);
  }

  @Delete("team/:id")
  @ApiOperation({ summary: "Revoke admin privileges" })
  async removeTeamMember(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.adminService.removeTeamMember(id, user.userId);
  }
}
