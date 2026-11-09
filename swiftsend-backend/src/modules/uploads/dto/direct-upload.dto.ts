import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class DirectUploadDto {
  @ApiProperty({
    description: "Base64 data URI (e.g. data:image/jpeg;base64,...) or raw string/buffer",
    example: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  })
  @IsString()
  @IsNotEmpty()
  dataUri: string;

  @ApiProperty({
    description: "Asset category folder",
    enum: ["document", "face", "proof", "avatar"],
    default: "document",
    required: false,
  })
  @IsString()
  @IsOptional()
  kind?: "document" | "face" | "proof" | "avatar";

  @ApiProperty({
    description: "Original filename or custom identifier",
    required: false,
  })
  @IsString()
  @IsOptional()
  fileName?: string;
}

