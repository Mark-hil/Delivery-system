import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public client: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>("REDIS_HOST", "localhost");
    const port = this.config.get<number>("REDIS_PORT", 6379);

    this.client = new Redis({
      host,
      port,
      maxRetriesPerRequest: 3,
    });

    this.client.on("connect", () => {
      this.logger.log(`⚡ Connected to Redis at ${host}:${port}`);
    });

    this.client.on("error", (err) => {
      this.logger.error("Redis connection error:", err);
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  // --- OTP Helper Methods ---

  async setOtp(destination: string, purpose: string, code: string, ttlSeconds = 300): Promise<void> {
    const key = `otp:${purpose}:${destination.toLowerCase().trim()}`;
    const attemptsKey = `otp:attempts:${purpose}:${destination.toLowerCase().trim()}`;
    await this.client.set(key, code, "EX", ttlSeconds);
    await this.client.del(attemptsKey);
  }

  async getOtp(destination: string, purpose: string): Promise<string | null> {
    const key = `otp:${purpose}:${destination.toLowerCase().trim()}`;
    return await this.client.get(key);
  }

  async verifyAndDeleteOtp(destination: string, purpose: string, code: string): Promise<boolean> {
    const normDest = destination.toLowerCase().trim();
    const key = `otp:${purpose}:${normDest}`;
    const attemptsKey = `otp:attempts:${purpose}:${normDest}`;

    // 1. Check max failed attempts (Max 5 attempts allowed)
    const attempts = await this.client.incr(attemptsKey);
    if (attempts === 1) {
      await this.client.expire(attemptsKey, 300);
    }
    if (attempts > 5) {
      this.logger.warn(`Max OTP verification attempts exceeded for ${normDest} (${purpose})`);
      await this.client.del(key);
      await this.client.del(attemptsKey);
      return false;
    }

    const stored = await this.client.get(key);
    if (!stored || stored !== code.trim()) {
      return false;
    }

    // Success: clear OTP and attempts
    await this.client.del(key);
    await this.client.del(attemptsKey);
    return true;
  }

  // --- Geospatial Rider Tracking Methods ---

  async updateRiderLocation(riderId: string, lat: number, lng: number): Promise<void> {
    // Redis GEOADD format: key longitude latitude member
    await this.client.geoadd("riders:online", lng, lat, riderId);
    // Also store last updated timestamp & coordinates in a hash for quick metadata reads
    await this.client.set(
      `rider:pos:${riderId}`,
      JSON.stringify({ lat, lng, updatedAt: Date.now() }),
      "EX",
      3600
    );
  }

  async removeRiderLocation(riderId: string): Promise<void> {
    await this.client.zrem("riders:online", riderId);
    await this.client.del(`rider:pos:${riderId}`);
  }

  async findNearbyRiders(
    lat: number,
    lng: number,
    radiusKm = 25
  ): Promise<{ riderId: string; distanceKm: number }[]> {
    try {
      const results = (await (this.client as any).geosearch(
        "riders:online",
        "FROMLONLAT",
        lng,
        lat,
        "BYRADIUS",
        radiusKm,
        "km",
        "WITHDIST",
        "ASC"
      )) as [string, string][];

      if (!results || !Array.isArray(results)) {
        return [];
      }

      return results.map(([riderId, dist]) => ({
        riderId,
        distanceKm: parseFloat(dist),
      }));
    } catch (err) {
      this.logger.error("Error searching nearby riders in Redis:", err);
      return [];
    }
  }

  async getRiderLocation(riderId: string): Promise<{ lat: number; lng: number } | null> {
    const pos = await this.client.geopos("riders:online", riderId);
    if (pos && pos[0]) {
      const [lngStr, latStr] = pos[0];
      return {
        lat: parseFloat(latStr),
        lng: parseFloat(lngStr),
      };
    }
    return null;
  }
}
