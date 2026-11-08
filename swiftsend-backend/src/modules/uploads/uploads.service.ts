import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { PresignedUrlDto } from "./dto/presigned-url.dto.js";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string;

  constructor(private readonly config: ConfigService) {
    const bucket = this.config.get<string>("AWS_S3_BUCKET");
    const region = this.config.get<string>("AWS_REGION");
    const accessKeyId = this.config.get<string>("AWS_ACCESS_KEY_ID");
    const secretAccessKey = this.config.get<string>("AWS_SECRET_ACCESS_KEY");

    if (bucket && accessKeyId && secretAccessKey) {
      this.bucketName = bucket;
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log(`📦 S3 Client initialized for bucket: ${bucket}`);
    } else {
      this.logger.warn(
        "⚠️ No S3 credentials configured. Using simulated direct upload URLs for local dev."
      );
    }
  }

  async getPresignedUrl(dto: PresignedUrlDto, userId?: string) {
    const ext = MIME_TO_EXT[dto.mimeType];
    if (!ext) {
      throw new BadRequestException("Unsupported file MIME type");
    }
    const ownerPrefix = userId ? `${userId}/` : "";
    const fileKey = `${ownerPrefix}${dto.kind}s/${randomUUID()}.${ext}`;

    const expiresInSeconds = Number(this.config.get<string>("UPLOAD_URL_EXPIRES_SECONDS"));

    if (this.s3Client && this.bucketName) {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        ContentType: dto.mimeType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
      const publicUrl = `https://${this.bucketName}.s3.amazonaws.com/${fileKey}`;

      return {
        uploadUrl,
        fileKey,
        publicUrl,
        expiresInSeconds,
      };
    }

    // Local / Dev Fallback: Returns simulated upload & storage URLs
    const backendUrl = this.config.get<string>("BACKEND_URL") ?? "";
    return {
      uploadUrl: `${backendUrl}/api/uploads/dev-mock/${fileKey}`,
      fileKey,
      publicUrl: `${backendUrl}/uploads/${fileKey}`,
      expiresInSeconds,
    };
  }
}
