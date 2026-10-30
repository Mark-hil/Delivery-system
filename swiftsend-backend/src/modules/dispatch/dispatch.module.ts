import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DispatchGateway } from "./dispatch.gateway.js";
import { DatabaseModule } from "../../database/database.module.js";

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(
          "JWT_ACCESS_SECRET",
          "swiftsend_jwt_access_super_secret_key_2026"
        ),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [DispatchGateway],
  exports: [DispatchGateway],
})
export class DispatchModule {}
