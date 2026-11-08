import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class PresignedUrlDto {
  @ApiProperty({ example: "id-front.jpg", description: "Original file name" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  filename: string;

  @ApiProperty({
    example: "image/jpeg",
    enum: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    description: "MIME type of the file",
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(["image/jpeg", "image/png", "image/webp", "application/pdf"])
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

  @ApiProperty({
    example: "document",
    enum: ["document", "selfie"],
    description: "Upload category",
  })
  @IsIn(["document", "selfie"])
  kind: "document" | "selfie";
}
