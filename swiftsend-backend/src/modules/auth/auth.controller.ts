import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service.js";
import { LoginDto } from "./dto/login.dto.js";
import { CustomerRegisterDto } from "./dto/customer-register.dto.js";
import { RiderRegisterDto } from "./dto/rider-register.dto.js";
import { RequestOtpDto, VerifyOtpDto } from "./dto/otp.dto.js";
import { RefreshTokenDto, ResetPasswordDto } from "./dto/password-reset.dto.js";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: "Unified Login for Customer, Rider, and Admin",
    description:
      "Checks credentials against all account types and returns the matching role and user object.",
  })
  @ApiResponse({ status: 200, description: "Login successful" })
  @ApiResponse({ status: 401, description: "Invalid credentials or account suspended" })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("customer/register")
  @ApiOperation({ summary: "Register a new Customer" })
  @ApiResponse({ status: 201, description: "Customer registered successfully" })
  @ApiResponse({ status: 409, description: "Email or phone already taken" })
  async customerRegister(@Body() dto: CustomerRegisterDto) {
    return this.authService.customerRegister(dto);
  }

  @Post("rider/register")
  @ApiOperation({
    summary: "Register a new Rider with compliance documents and live selfie photo",
  })
  @ApiResponse({ status: 201, description: "Rider registered successfully" })
  @ApiResponse({ status: 409, description: "Email or phone already taken" })
  async riderRegister(@Body() dto: RiderRegisterDto) {
    return this.authService.riderRegister(dto);
  }

  @Post("otp/request")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: "Request a 4-digit OTP code" })
  @ApiResponse({ status: 200, description: "OTP generated and stored in Redis" })
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "Verify a 4-digit OTP code against Redis" })
  @ApiResponse({ status: 200, description: "Verification outcome" })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post("password-reset")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password with verified OTP" })
  @ApiResponse({ status: 200, description: "Password reset successful" })
  @ApiResponse({ status: 400, description: "Invalid or expired OTP code" })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access and refresh JWT tokens" })
  @ApiResponse({ status: 200, description: "Tokens refreshed" })
  @ApiResponse({ status: 401, description: "Invalid refresh token" })
  async refreshTokens(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }
}
