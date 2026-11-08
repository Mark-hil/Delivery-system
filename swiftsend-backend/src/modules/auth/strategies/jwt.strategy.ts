import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../database/prisma.service.js";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role: "customer" | "rider" | "admin";
    typ?: string;
  }) {
    if (payload.typ === "refresh") {
      throw new UnauthorizedException("Refresh token cannot be used as an access token");
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.status === "Suspended") {
      throw new UnauthorizedException("User account is invalid or suspended");
    }
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
