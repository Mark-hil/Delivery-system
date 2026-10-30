import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../database/prisma.service.js";
import { RedisService } from "../../database/redis.service.js";

export interface ComplianceAuditReport {
  expiredDocsCount: number;
  suspendedRidersCount: number;
  expiringIn14DaysCount: number;
  expiringIn7DaysCount: number;
  expiringIn1DayCount: number;
  checkedAt: string;
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  /**
   * Automated Cron Job: Runs daily at midnight to audit rider compliance documents.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyComplianceAudit() {
    this.logger.log("🕒 Running daily rider compliance & document expiration audit...");
    return this.runComplianceCheck();
  }

  /**
   * Run compliance audit across all rider documents and enforce compliance gates.
   */
  async runComplianceCheck(): Promise<ComplianceAuditReport> {
    const now = new Date();
    const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // 1. Find all expired required documents
    const expiredDocs = await this.prisma.riderDocument.findMany({
      where: {
        required: true,
        expiresAt: { lte: now },
      },
      include: {
        rider: {
          include: { user: true },
        },
      },
    });

    // 2. Enforce compliance gate: Suspend riders with expired required documents and remove from active dispatch pool
    const suspendedRiderIds = new Set<string>();
    for (const doc of expiredDocs) {
      if (doc.rider.approvalStatus !== "Suspended") {
        await this.prisma.riderProfile.update({
          where: { id: doc.riderId },
          data: {
            approvalStatus: "Suspended",
            isOnline: false,
          },
        });
        // Remove from Redis online geospatial dispatch index
        await this.redis.removeRiderLocation(doc.riderId);
        suspendedRiderIds.add(doc.riderId);
        this.logger.warn(
          `⛔ Suspended rider ${doc.rider.user.fullName} (${doc.rider.id}) due to expired ${doc.label}`
        );
      }
    }

    // 3. Find documents expiring in 1 day, 7 days, 14 days
    const [expiring1Day, expiring7Days, expiring14Days] = await Promise.all([
      this.prisma.riderDocument.count({
        where: {
          required: true,
          expiresAt: { gt: now, lte: in1Day },
        },
      }),
      this.prisma.riderDocument.count({
        where: {
          required: true,
          expiresAt: { gt: in1Day, lte: in7Days },
        },
      }),
      this.prisma.riderDocument.count({
        where: {
          required: true,
          expiresAt: { gt: in7Days, lte: in14Days },
        },
      }),
    ]);

    const report: ComplianceAuditReport = {
      expiredDocsCount: expiredDocs.length,
      suspendedRidersCount: suspendedRiderIds.size,
      expiringIn14DaysCount: expiring14Days,
      expiringIn7DaysCount: expiring7Days,
      expiringIn1DayCount: expiring1Day,
      checkedAt: now.toISOString(),
    };

    this.logger.log(`✅ Compliance audit completed: ${JSON.stringify(report)}`);
    return report;
  }
}
