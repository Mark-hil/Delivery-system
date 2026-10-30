import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { RedisService } from "../../database/redis.service.js";

export interface PlatformSettingsData {
  baseFee: number;
  perKmRate: number;
  serviceFee: number;
  activeRegions: string;
  coverageRadiusKm: number;
  pushEnabled: boolean;
  smsEnabled: boolean;
  maintenanceMode: boolean;
  appVersion: string;
  promoTitle: string;
  promoSubtitle: string;
  promoPercentLabel: string;
}

const SETTINGS_CACHE_KEY = "platform:settings";

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  async getSettings(): Promise<PlatformSettingsData> {
    // 1. Try Redis cache first
    try {
      const cached = await this.redis.client.get(SETTINGS_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      this.logger.warn("Redis cache read failed, falling back to database", err);
    }

    // 2. Fetch from Database
    let dbSettings = await this.prisma.platformSettings.findUnique({
      where: { id: 1 },
    });

    if (!dbSettings) {
      dbSettings = await this.prisma.platformSettings.create({
        data: { id: 1 },
      });
    }

    const result: PlatformSettingsData = {
      baseFee: Number(dbSettings.baseFee),
      perKmRate: Number(dbSettings.perKmRate),
      serviceFee: Number(dbSettings.serviceFee),
      activeRegions: dbSettings.activeRegions,
      coverageRadiusKm: dbSettings.coverageRadiusKm,
      pushEnabled: dbSettings.pushEnabled,
      smsEnabled: dbSettings.smsEnabled,
      maintenanceMode: dbSettings.maintenanceMode,
      appVersion: dbSettings.appVersion,
      promoTitle: dbSettings.promoTitle,
      promoSubtitle: dbSettings.promoSubtitle,
      promoPercentLabel: dbSettings.promoPercentLabel,
    };

    // Cache in Redis for 10 minutes (600s)
    try {
      await this.redis.client.set(SETTINGS_CACHE_KEY, JSON.stringify(result), "EX", 600);
    } catch {
      // Ignore cache write errors
    }

    return result;
  }

  async updateSettings(patch: Partial<PlatformSettingsData>): Promise<PlatformSettingsData> {
    const updated = await this.prisma.platformSettings.update({
      where: { id: 1 },
      data: {
        ...(patch.baseFee !== undefined && { baseFee: patch.baseFee }),
        ...(patch.perKmRate !== undefined && { perKmRate: patch.perKmRate }),
        ...(patch.serviceFee !== undefined && { serviceFee: patch.serviceFee }),
        ...(patch.activeRegions !== undefined && { activeRegions: patch.activeRegions }),
        ...(patch.coverageRadiusKm !== undefined && {
          coverageRadiusKm: patch.coverageRadiusKm,
        }),
        ...(patch.pushEnabled !== undefined && { pushEnabled: patch.pushEnabled }),
        ...(patch.smsEnabled !== undefined && { smsEnabled: patch.smsEnabled }),
        ...(patch.maintenanceMode !== undefined && {
          maintenanceMode: patch.maintenanceMode,
        }),
        ...(patch.appVersion !== undefined && { appVersion: patch.appVersion }),
        ...(patch.promoTitle !== undefined && { promoTitle: patch.promoTitle }),
        ...(patch.promoSubtitle !== undefined && { promoSubtitle: patch.promoSubtitle }),
        ...(patch.promoPercentLabel !== undefined && {
          promoPercentLabel: patch.promoPercentLabel,
        }),
      },
    });

    // Invalidate Redis cache immediately so all calculations update in real time
    try {
      await this.redis.client.del(SETTINGS_CACHE_KEY);
    } catch {
      // Ignore error
    }

    return this.getSettings();
  }
}
