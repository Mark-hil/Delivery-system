import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { randomUUID } from "crypto";
import { PresignedUrlDto } from "./dto/presigned-url.dto.js";
import { DirectUploadDto } from "./dto/direct-upload.dto.js";

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
  private isCloudinaryConfigured = false;
  private cloudinaryFolder: string;

  constructor(private readonly config: ConfigService) {
    // 1. Cloudinary Configuration
    const cloudName = this.config.get<string>("CLOUDINARY_CLOUD_NAME");
    const apiKey = this.config.get<string>("CLOUDINARY_API_KEY");
    const apiSecret = this.config.get<string>("CLOUDINARY_API_SECRET");
    this.cloudinaryFolder = this.config.get<string>("CLOUDINARY_FOLDER") || "swiftsend";

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isCloudinaryConfigured = true;
      this.logger.log(`☁️ Cloudinary initialized for cloud: ${cloudName} (folder: ${this.cloudinaryFolder})`);
    } else {
      this.logger.warn(
        "⚠️ No Cloudinary credentials configured. (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET). Direct uploads will fall back to local dev mock URLs."
      );
    }

    // 2. AWS S3 Configuration (Optional fallback)
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
    }
  }

  /**
   * Upload file or base64 directly to Cloudinary
   */
  async uploadDirect(dto: DirectUploadDto, userId?: string): Promise<{ publicUrl: string; fileKey: string; format?: string }> {
    const kind = dto.kind || "document";
    const ownerPrefix = userId ? `${userId}/` : "";
    const uniqueId = randomUUID();
    const publicId = `${this.cloudinaryFolder}/${ownerPrefix}${kind}s/${uniqueId}`;

    if (this.isCloudinaryConfigured) {
      try {
        const uploadRes: UploadApiResponse = await cloudinary.uploader.upload(dto.dataUri, {
          public_id: publicId,
          resource_type: "auto",
          folder: undefined, // already encoded in public_id
          tags: [kind, "swiftsend", ...(userId ? [userId] : [])],
        });

        return {
          publicUrl: uploadRes.secure_url,
          fileKey: uploadRes.public_id,
          format: uploadRes.format,
        };
      } catch (err: any) {
        this.logger.error(`Cloudinary upload failed: ${err.message}`);
        throw new BadRequestException(`Cloudinary upload error: ${err.message}`);
      }
    }

    // Local / Dev Fallback: return consistent mock URL if credentials not provided
    const backendUrl = this.config.get<string>("BACKEND_URL") ?? "http://localhost:4000";
    const fileKey = `${ownerPrefix}${kind}s/${uniqueId}.jpg`;
    return {
      publicUrl: `${backendUrl}/uploads/${fileKey}`,
      fileKey,
      format: "jpg",
    };
  }

  async getPresignedUrl(dto: PresignedUrlDto, userId?: string) {
    const ext = MIME_TO_EXT[dto.mimeType];
    if (!ext) {
      throw new BadRequestException("Unsupported file MIME type");
    }
    const ownerPrefix = userId ? `${userId}/` : "";
    const fileKey = `${ownerPrefix}${dto.kind}s/${randomUUID()}.${ext}`;

    const expiresInSeconds = Number(this.config.get<string>("UPLOAD_URL_EXPIRES_SECONDS") || 300);

    // If Cloudinary is configured, generate signed upload parameters
    if (this.isCloudinaryConfigured) {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const publicId = `${this.cloudinaryFolder}/${ownerPrefix}${dto.kind}s/${randomUUID()}`;
      const signature = cloudinary.utils.api_sign_request(
        { timestamp, folder: this.cloudinaryFolder },
        this.config.get<string>("CLOUDINARY_API_SECRET")!
      );

      return {
        uploadUrl: `https://api.cloudinary.com/v1_1/${this.config.get<string>("CLOUDINARY_CLOUD_NAME")}/auto/upload`,
        fileKey: publicId,
        publicUrl: `https://res.cloudinary.com/${this.config.get<string>("CLOUDINARY_CLOUD_NAME")}/image/upload/${publicId}.${ext}`,
        expiresInSeconds,
        cloudinaryParams: {
          timestamp,
          signature,
          apiKey: this.config.get<string>("CLOUDINARY_API_KEY"),
          folder: this.cloudinaryFolder,
        },
      };
    }

    // S3 configuration fallback
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
    const backendUrl = this.config.get<string>("BACKEND_URL") ?? "http://localhost:4000";
    return {
      uploadUrl: `${backendUrl}/api/uploads/dev-mock/${fileKey}`,
      fileKey,
      publicUrl: `${backendUrl}/uploads/${fileKey}`,
      expiresInSeconds,
    };
  }
}
