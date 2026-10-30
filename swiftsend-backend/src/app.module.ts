import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { DatabaseModule } from "./database/database.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { UploadsModule } from "./modules/uploads/uploads.module.js";
import { SettingsModule } from "./modules/settings/settings.module.js";
import { DeliveriesModule } from "./modules/deliveries/deliveries.module.js";
import { RiderModule } from "./modules/rider/rider.module.js";
import { DispatchModule } from "./modules/dispatch/dispatch.module.js";
import { AdminModule } from "./modules/admin/admin.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120, // Default 120 requests per minute globally
      },
    ]),
    DatabaseModule,
    AuthModule,
    UploadsModule,
    SettingsModule,
    DeliveriesModule,
    RiderModule,
    DispatchModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
