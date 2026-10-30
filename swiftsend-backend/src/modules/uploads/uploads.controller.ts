import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { UploadsService } from "./uploads.service.js";
import { PresignedUrlDto } from "./dto/presigned-url.dto.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";

@ApiTags("Uploads")
@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post("presigned-url")
  @ApiOperation({
    summary: "Generate pre-signed S3/R2 direct upload URL",
    description:
      "Generates a temporary upload URL so the client can directly upload documents or selfies to cloud storage without overloading the server.",
  })
  @ApiResponse({ status: 201, description: "Upload URL generated successfully" })
  async getPresignedUrl(@Body() dto: PresignedUrlDto) {
    return this.uploadsService.getPresignedUrl(dto);
  }
}
