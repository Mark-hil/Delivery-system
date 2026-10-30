import { Module } from "@nestjs/common";
import { DeliveriesService } from "./deliveries.service.js";
import { DeliveriesController } from "./deliveries.controller.js";
import { SettingsModule } from "../settings/settings.module.js";
import { DispatchModule } from "../dispatch/dispatch.module.js";

@Module({
  imports: [SettingsModule, DispatchModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
