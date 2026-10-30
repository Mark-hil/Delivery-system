import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString } from "class-validator";

export class PresignedUrlDto {
  @ApiProperty({ example: "id-front.jpg", description: "Original file name" })
  @IsNotEmpty()
  @IsString()
  filename: string;

  @ApiProperty({ example: "image/jpeg", description: "MIME type of the file" })
  @IsNotEmpty()
  @IsString()
  mimeType: string;

  @ApiProperty({
    example: "document",
    enum: ["document", "selfie"],
    description: "Upload category",
  })
  @IsIn(["document", "selfie"])
  kind: "document" | "selfie";
}
