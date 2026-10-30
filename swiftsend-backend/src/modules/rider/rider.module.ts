import { Module } from "@nestjs/common";
import { RiderService } from "./rider.service.js";
import { RiderController } from "./rider.controller.js";
import { DispatchModule } from "../dispatch/dispatch.module.js";

@Module({
  imports: [DispatchModule],
  controllers: [RiderController],
  providers: [RiderService],
  exports: [RiderService],
})
export class RiderModule {}
