import { Body, Controller, Post, UseGuards, Optional } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { UploadsService } from "./uploads.service.js";
import { PresignedUrlDto } from "./dto/presigned-url.dto.js";
import { DirectUploadDto } from "./dto/direct-upload.dto.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";

@ApiTags("Uploads")
@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post("direct")
  @ApiOperation({
    summary: "Upload image/document directly to Cloudinary",
    description: "Accepts base64 data URI or raw file and stores it in Cloudinary under the appropriate folder.",
  })
  @ApiResponse({ status: 201, description: "File uploaded successfully to Cloudinary" })
  async uploadDirect(
    @Body() dto: DirectUploadDto
  ) {
    return this.uploadsService.uploadDirect(dto);
  }

  @Post("presigned-url")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary: "Generate pre-signed Cloudinary / S3 upload parameters",
    description: "Generates a temporary owner-scoped upload URL or signature to directly upload documents or selfies.",
  })
  @ApiResponse({ status: 201, description: "Upload URL or signature generated successfully" })
  async getPresignedUrl(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: PresignedUrlDto
  ) {
    return this.uploadsService.getPresignedUrl(dto, user.userId);
  }
}
