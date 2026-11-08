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
        secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [DispatchGateway],
  exports: [DispatchGateway],
})
export class DispatchModule {}
