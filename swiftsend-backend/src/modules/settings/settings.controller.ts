import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SettingsService } from "./settings.service.js";
import { UpdateSettingsDto } from "./dto/update-settings.dto.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";

@ApiTags("Platform Settings")
@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("settings")
  @ApiOperation({
    summary: "Get live platform settings",
    description: "Fetches current pricing, active regions, and promo banner copy.",
  })
  @ApiResponse({ status: 200, description: "Platform settings" })
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch("admin/settings")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary: "Update platform settings (Admin only)",
    description:
      "Mutates live base fees, per-km rates, active regions, and immediately invalidates the Redis cache.",
  })
  @ApiResponse({ status: 200, description: "Updated platform settings" })
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }
}
