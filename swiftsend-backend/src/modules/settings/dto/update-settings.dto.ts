import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 15.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseFee?: number;

  @ApiPropertyOptional({ example: 3.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  perKmRate?: number;

  @ApiPropertyOptional({ example: 2.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceFee?: number;

  @ApiPropertyOptional({ example: "Greater Accra, Kumasi, Takoradi" })
  @IsOptional()
  @IsString()
  activeRegions?: string;

  @ApiPropertyOptional({ example: 25.0 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  coverageRadiusKm?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @ApiPropertyOptional({ example: "1.0.0" })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({ example: "Get 20% off your next 3 deliveries" })
  @IsOptional()
  @IsString()
  promoTitle?: string;

  @ApiPropertyOptional({ example: "Use code SWIFT20 at checkout" })
  @IsOptional()
  @IsString()
  promoSubtitle?: string;

  @ApiPropertyOptional({ example: "20% OFF" })
  @IsOptional()
  @IsString()
  promoPercentLabel?: string;
}
