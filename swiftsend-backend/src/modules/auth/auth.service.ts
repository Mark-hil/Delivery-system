import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { randomInt } from "crypto";
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
import { SmsService } from "../sms/sms.service.js";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGhanaPhoneVariants(input: string): string[] {
  const clean = input.replace(/[\s-]/g, "");
  const variants = new Set<string>([input.trim(), clean]);
  if (/^0\d{9}$/.test(clean)) {
    variants.add(`233${clean.slice(1)}`);
    variants.add(`+233${clean.slice(1)}`);
  } else if (/^233\d{9}$/.test(clean)) {
    variants.add(`0${clean.slice(3)}`);
    variants.add(`+${clean}`);
  } else if (/^\+233\d{9}$/.test(clean)) {
    variants.add(`0${clean.slice(4)}`);
    variants.add(clean.slice(1));
  }
  return Array.from(variants);
}

function maskPhone(phone: string): string {
  const clean = phone.replace(/\s+/g, "");
  if (clean.length < 7) return clean;
  return `${clean.slice(0, 3)} *** ${clean.slice(-4)}`;
}

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly smsService: SmsService,
  ) {
    const accessSecret = this.config.get<string>("JWT_ACCESS_SECRET");
    const refreshSecret = this.config.get<string>("JWT_REFRESH_SECRET");
    if (!accessSecret || !refreshSecret) {
      throw new Error(
        "CRITICAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET environment variables must be configured"
      );
    }
    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
    this.accessExpiresIn = this.config.get<string>("JWT_ACCESS_EXPIRES_IN")!;
    this.refreshExpiresIn = this.config.get<string>("JWT_REFRESH_EXPIRES_IN")!;
  }

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
            approvalStatus: "Pending", // Requires admin KYC verification
            facePhotoUri: dto.facePhotoUri || null,
            documents: {
              create: dto.documents.map((d) => ({
                kind: d.kind,
                label: d.label,
                required: d.required,
                uri: d.uri || null,
                uploadedAt: d.uploadedAt ? new Date(d.uploadedAt) : new Date(),
                expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
                isVerified: false,
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
    const rawDest = dto.destination.trim();
    let smsDestination = rawDest;

    if (dto.purpose === "resetPassword") {
      const phoneVariants = getGhanaPhoneVariants(rawDest);
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: rawDest.toLowerCase() },
            { phone: { in: phoneVariants } },
          ],
        },
      });
      if (!user) {
        throw new NotFoundException("No account found with this phone number or email");
      }
      smsDestination = user.phone || rawDest;
    }

    // Generate cryptographically secure 6-digit code matching the frontend 6-digit OTP input
    const code = randomInt(100000, 1000000).toString();

    // Store in Redis with 5 minute TTL (300s)
    await this.redis.setOtp(rawDest, dto.purpose, code, 300);

    // Dispatch SMS via Arkesel Gateway to the user's phone number
    await this.smsService.sendOtp(smsDestination, code, dto.purpose);

    const isSandboxDev =
      this.config.get<string>("NODE_ENV") !== "production" &&
      this.config.get<string>("ARKESEL_SANDBOX") === "true";

    return {
      success: true,
      sent: true,
      maskedPhone: maskPhone(smsDestination),
      message: `SMS verification code sent to ${maskPhone(smsDestination)}`,
      ...(isSandboxDev ? { devCode: code } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const isValid = await this.redis.verifyAndDeleteOtp(dto.destination, dto.purpose, dto.code);
    // Keep resetPassword OTP valid for the subsequent /auth/password-reset step (5 min TTL)
    if (isValid && dto.purpose === "resetPassword") {
      await this.redis.setOtp(dto.destination, dto.purpose, dto.code.trim(), 300);
    }
    return {
      verified: isValid,
    };
  }

  // ---------------------------------------------------------
  // 5. PASSWORD RESET
  // ---------------------------------------------------------
  async resetPassword(dto: ResetPasswordDto) {
    const identifier = dto.email.trim();
    const phoneVariants = getGhanaPhoneVariants(identifier);

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: { in: phoneVariants } },
        ],
      },
    });

    if (!user) {
      throw new NotFoundException("No account found with this phone number or email");
    }

    // Verify OTP code (purpose: resetPassword)
    const isOtpValid = await this.redis.verifyAndDeleteOtp(identifier, "resetPassword", dto.otpCode);
    if (!isOtpValid) {
      throw new BadRequestException("Invalid or expired verification code");
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      }),
      // Revoke all active refresh tokens upon password reset
      this.prisma.refreshToken.deleteMany({
        where: { userId: user.id },
      }),
    ]);

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
      this.jwt.signAsync(
        { ...payload, typ: "access" },
        {
          secret: this.accessSecret,
          expiresIn: this.accessExpiresIn as any,
        }
      ),
      this.jwt.signAsync(
        { ...payload, typ: "refresh" },
        {
          secret: this.refreshSecret,
          expiresIn: this.refreshExpiresIn as any,
        }
      ),
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
        secret: this.refreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { refreshTokens: true },
      });

      if (!user || user.status === "Suspended") {
        throw new UnauthorizedException("Invalid token or user suspended");
      }

      // 1. Purge expired refresh tokens for this user
      const now = new Date();
      await this.prisma.refreshToken.deleteMany({
        where: { userId: user.id, expiresAt: { lte: now } },
      });

      // 2. Verify that the refresh token exists in the database and is not expired
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

      // 3. Rotate token: delete used token
      await this.prisma.refreshToken.delete({
        where: { id: matchedTokenRecord.id },
      });

      // 4. Issue fresh token pair
      return await this.generateTokens(user.id, user.email, user.role);
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.refreshSecret,
      });

      const tokens = await this.prisma.refreshToken.findMany({
        where: { userId: payload.sub },
      });

      const now = new Date();
      for (const record of tokens) {
        if (record.expiresAt <= now) {
          await this.prisma.refreshToken.delete({ where: { id: record.id } }).catch(() => null);
          continue;
        }
        const isMatch = await bcrypt.compare(refreshToken, record.tokenHash);
        if (isMatch) {
          await this.prisma.refreshToken.delete({ where: { id: record.id } }).catch(() => null);
          break;
        }
      }
    } catch {
      // Even if token is already expired or invalid, return success so client clears state
    }

    return {
      success: true,
      message: "Logged out successfully",
    };
  }
}
