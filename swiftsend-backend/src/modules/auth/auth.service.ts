import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma.service.js";
import { RedisService } from "../../database/redis.service.js";
import { LoginDto } from "./dto/login.dto.js";
import { CustomerRegisterDto } from "./dto/customer-register.dto.js";
import { RiderRegisterDto } from "./dto/rider-register.dto.js";
import { RequestOtpDto, VerifyOtpDto } from "./dto/otp.dto.js";
import { ResetPasswordDto } from "./dto/password-reset.dto.js";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  // ---------------------------------------------------------
  // 1. UNIFIED LOGIN
  // ---------------------------------------------------------
  async login(dto: LoginDto) {
    const ident = dto.identifier.trim().toLowerCase();

    // Find user across all 3 roles by email OR phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: ident }, { phone: ident }],
      },
      include: {
        customerProfile: true,
        riderProfile: {
          include: {
            documents: true,
          },
        },
        adminProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.status === "Suspended") {
      throw new UnauthorizedException("Your account has been suspended");
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Format response payload to match frontend AppUser interfaces exactly
    let formattedUser: any;
    if (user.role === "customer" && user.customerProfile) {
      formattedUser = {
        id: user.customerProfile.id,
        role: "customer",
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        avatarInitials: user.customerProfile.avatarInitials,
        walletBalance: Number(user.customerProfile.walletBalance),
      };
    } else if (user.role === "rider" && user.riderProfile) {
      formattedUser = {
        id: user.riderProfile.id,
        role: "rider",
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        vehicleType: user.riderProfile.vehicleType,
        plateNumber: user.riderProfile.plateNumber,
        rating: Number(user.riderProfile.rating),
        trips: user.riderProfile.trips,
        isOnline: user.riderProfile.isOnline,
        facePhotoUri: user.riderProfile.facePhotoUri,
        documents: user.riderProfile.documents.map(
          (d: {
            kind: any;
            label: string;
            required: boolean;
            uri: string | null;
            uploadedAt: Date | null;
            expiresAt: Date | null;
          }) => ({
            kind: d.kind,
            label: d.label,
            required: d.required,
            uri: d.uri,
            uploadedAt: d.uploadedAt ? d.uploadedAt.toISOString() : null,
            expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
          })
        ),
      };
    } else {
      formattedUser = {
        id: user.id,
        role: "admin",
        fullName: user.fullName,
        email: user.email,
      };
    }

    return {
      role: user.role,
      user: formattedUser,
      tokens,
    };
  }

  // ---------------------------------------------------------
  // 2. CUSTOMER REGISTRATION
  // ---------------------------------------------------------
  async customerRegister(dto: CustomerRegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email.toLowerCase().trim() }, { phone: dto.phone.trim() }],
      },
    });

    if (existing) {
      throw new ConflictException("Email or phone number is already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const initials = getInitials(dto.fullName);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone.trim(),
        fullName: dto.fullName.trim(),
        passwordHash,
        role: "customer",
        customerProfile: {
          create: {
            avatarInitials: initials,
            walletBalance: 0.0,
          },
        },
      },
      include: {
        customerProfile: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      id: user.customerProfile!.id,
      role: "customer" as const,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      avatarInitials: initials,
      walletBalance: 0.0,
      tokens,
    };
  }

  // ---------------------------------------------------------
  // 3. RIDER REGISTRATION
  // ---------------------------------------------------------
  async riderRegister(dto: RiderRegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email.toLowerCase().trim() }, { phone: dto.phone.trim() }],
      },
    });

    if (existing) {
      throw new ConflictException("Email or phone number is already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone.trim(),
        fullName: dto.fullName.trim(),
        passwordHash,
        role: "rider",
        riderProfile: {
          create: {
            vehicleType: dto.vehicleType,
            plateNumber: dto.plateNumber.trim(),
            rating: 5.0,
            trips: 0,
            isOnline: false,
            approvalStatus: "Approved", // Auto-approved for demo; admin can suspend
            facePhotoUri: dto.facePhotoUri || null,
            documents: {
              create: dto.documents.map((d) => ({
                kind: d.kind,
                label: d.label,
                required: d.required,
                uri: d.uri || null,
                uploadedAt: d.uploadedAt ? new Date(d.uploadedAt) : new Date(),
                expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
                isVerified: true,
              })),
            },
          },
        },
      },
      include: {
        riderProfile: {
          include: {
            documents: true,
          },
        },
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      id: user.riderProfile!.id,
      role: "rider" as const,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      vehicleType: user.riderProfile!.vehicleType,
      plateNumber: user.riderProfile!.plateNumber,
      rating: Number(user.riderProfile!.rating),
      trips: user.riderProfile!.trips,
      isOnline: user.riderProfile!.isOnline,
      facePhotoUri: user.riderProfile!.facePhotoUri,
      documents: user.riderProfile!.documents.map(
        (d: {
          kind: any;
          label: string;
          required: boolean;
          uri: string | null;
          uploadedAt: Date | null;
          expiresAt: Date | null;
        }) => ({
          kind: d.kind,
          label: d.label,
          required: d.required,
          uri: d.uri,
          uploadedAt: d.uploadedAt ? d.uploadedAt.toISOString() : null,
          expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
        })
      ),
      tokens,
    };
  }

  // ---------------------------------------------------------
  // 4. OTP REQUEST & VERIFICATION (Redis Powered)
  // ---------------------------------------------------------
  async requestOtp(dto: RequestOtpDto) {
    // Generate secure 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    // Store in Redis with 5 minute TTL (300s)
    await this.redis.setOtp(dto.destination, dto.purpose, code, 300);

    // In production, this dispatches via SMS/Email worker queue.
    // OTP code is never leaked in the HTTP response payload.
    return {
      success: true,
      message: `Verification code sent to ${dto.destination}`,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const isValid = await this.redis.verifyAndDeleteOtp(dto.destination, dto.purpose, dto.code);
    return {
      verified: isValid,
    };
  }

  // ---------------------------------------------------------
  // 5. PASSWORD RESET
  // ---------------------------------------------------------
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new NotFoundException("No account found with this email");
    }

    // Verify OTP code (purpose: resetPassword)
    const isOtpValid = await this.redis.verifyAndDeleteOtp(dto.email, "resetPassword", dto.otpCode);
    if (!isOtpValid) {
      throw new BadRequestException("Invalid or expired verification code");
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    return {
      success: true,
      message: "Password reset successfully",
    };
  }

  // ---------------------------------------------------------
  // 6. TOKEN HELPERS
  // ---------------------------------------------------------
  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>(
          "JWT_ACCESS_SECRET",
          "swiftsend_jwt_access_super_secret_key_2026"
        ),
        expiresIn: "1h",
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>(
          "JWT_REFRESH_SECRET",
          "swiftsend_jwt_refresh_super_secret_key_2026"
        ),
        expiresIn: "30d",
      }),
    ]);

    // Store hashed refresh token in DB
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>(
          "JWT_REFRESH_SECRET",
          "swiftsend_jwt_refresh_super_secret_key_2026"
        ),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { refreshTokens: true },
      });

      if (!user || user.status === "Suspended") {
        throw new UnauthorizedException("Invalid token or user suspended");
      }

      // 1. Verify that the refresh token exists in the database and is not expired
      const now = new Date();
      let matchedTokenRecord: any = null;
      for (const record of user.refreshTokens) {
        if (record.expiresAt > now) {
          const isMatch = await bcrypt.compare(refreshToken, record.tokenHash);
          if (isMatch) {
            matchedTokenRecord = record;
            break;
          }
        }
      }

      if (!matchedTokenRecord) {
        throw new UnauthorizedException("Refresh token has been revoked or expired");
      }

      // 2. Rotate token: delete used token
      await this.prisma.refreshToken.delete({
        where: { id: matchedTokenRecord.id },
      });

      // 3. Issue fresh token pair
      return await this.generateTokens(user.id, user.email, user.role);
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException("Invalid refresh token");
    }
  }
}
