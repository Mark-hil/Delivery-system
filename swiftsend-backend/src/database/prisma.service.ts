import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("🐘 Connected to PostgreSQL database");
    } catch (err) {
      this.logger.warn(
        `⚠️ Could not connect to PostgreSQL on startup (${(err as Error).message}). Ensure Docker Compose is running.`
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Executes a database operation inside a transaction with PostgreSQL Row-Level Security (RLS)
   * session variables (`app.current_user_id` and `app.current_user_role`) scoped locally.
   */
  async withRlsContext<T>(
    actor: { userId: string; role: "customer" | "rider" | "admin" },
    fn: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${actor.userId}, true), set_config('app.current_user_role', ${actor.role}, true)`;
      return fn(tx);
    });
  }
}
