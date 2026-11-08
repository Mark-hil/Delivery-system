import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

const SAFE_URI_REGEX = /^(https?:\/\/|data:image\/(jpeg|png|webp);base64,|\/uploads\/)/i;

export enum VehicleTypeEnum {
  bike = "bike",
  car = "car",
  van = "van",
  truck = "truck",
}

export enum DocumentKindEnum {
  idFront = "idFront",
  idBack = "idBack",
  drivingLicense = "drivingLicense",
  insurance = "insurance",
  others = "others",
}

export class RiderDocumentDto {
  @ApiProperty({ enum: DocumentKindEnum, example: DocumentKindEnum.drivingLicense })
  @IsEnum(DocumentKindEnum)
  kind: DocumentKindEnum;

  @ApiProperty({ example: "Driving license" })
  @IsString()
  @MaxLength(120)
  label: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({ example: "https://storage.swiftsend.app/docs/license.jpg" })
  @IsOptional()
  @IsString()
  @MaxLength(2000000)
  @Matches(SAFE_URI_REGEX, {
    message: "Document URI must use http(s)://, /uploads/, or a base64 image data URI",
  })
  uri: string | null;

  @ApiPropertyOptional({ example: "2026-10-26T12:00:00Z" })
  @IsOptional()
  @IsString()
  uploadedAt: string | null;

  @ApiPropertyOptional({ example: "2027-10-26T12:00:00Z" })
  @IsOptional()
  @IsString()
  expiresAt: string | null;
}

export class RiderRegisterDto {
  @ApiProperty({ example: "Kwame Mensah" })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: "0204451198" })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: "kwame.mensah@email.com" })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: "Password1" })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: VehicleTypeEnum, example: VehicleTypeEnum.bike })
  @IsEnum(VehicleTypeEnum)
  vehicleType: VehicleTypeEnum;

  @ApiProperty({ example: "GT 4471-22" })
  @IsNotEmpty()
  @IsString()
  plateNumber: string;

  @ApiProperty({ type: [RiderDocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RiderDocumentDto)
  documents: RiderDocumentDto[];

  @ApiPropertyOptional({
    example: "https://storage.swiftsend.app/selfies/kwame.jpg",
    description: "Live selfie captured at registration",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000000)
  @Matches(SAFE_URI_REGEX, {
    message: "Face photo URI must use http(s)://, /uploads/, or a base64 image data URI",
  })
  facePhotoUri: string | null;
}
