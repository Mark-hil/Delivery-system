import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AdminController } from "./admin.controller.js";
import { AdminService } from "./admin.service.js";
import { ComplianceService } from "./compliance.service.js";
import { DispatchModule } from "../dispatch/dispatch.module.js";

@Module({
  imports: [ScheduleModule.forRoot(), DispatchModule],
  controllers: [AdminController],
  providers: [AdminService, ComplianceService],
  exports: [AdminService, ComplianceService],
})
export class AdminModule {}
