import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { VehicleTypeEnum } from "../../auth/dto/rider-register.dto.js";

export enum DeliveryTypeEnum {
  immediate = "immediate",
  scheduled = "scheduled",
}

export class CreateDeliveryDto {
  @ApiProperty({ example: "Airport Residential Area, Accra" })
  @IsNotEmpty()
  @IsString()
  pickupAddress: string;

  @ApiProperty({ example: "Osu Oxford Street, Accra" })
  @IsNotEmpty()
  @IsString()
  dropoffAddress: string;

  @ApiProperty({ example: "Documents" })
  @IsNotEmpty()
  @IsString()
  packageType: string;

  @ApiProperty({ example: "Sealed business contract" })
  @IsNotEmpty()
  @IsString()
  packageDescription: string;

  @ApiProperty({ example: "0.5 kg" })
  @IsNotEmpty()
  @IsString()
  weight: string;

  @ApiPropertyOptional({ example: "Call recipient upon arrival" })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({ enum: DeliveryTypeEnum, example: DeliveryTypeEnum.immediate })
  @IsEnum(DeliveryTypeEnum)
  deliveryType: DeliveryTypeEnum;

  @ApiProperty({ enum: VehicleTypeEnum, example: VehicleTypeEnum.bike })
  @IsEnum(VehicleTypeEnum)
  vehicleType: VehicleTypeEnum;

  @ApiProperty({ example: 6.2 })
  @IsNumber()
  @Min(0)
  distanceKm: number;

  @ApiProperty({ example: 18 })
  @IsNumber()
  @Min(0)
  etaMinutes: number;

  @ApiProperty({ example: 15.0 })
  @IsNumber()
  @Min(0)
  baseFee: number;

  @ApiProperty({ example: 21.7 })
  @IsNumber()
  @Min(0)
  distanceFee: number;

  @ApiProperty({ example: 2.0 })
  @IsNumber()
  @Min(0)
  serviceFee: number;

  @ApiProperty({ example: 38.7 })
  @IsNumber()
  @Min(0)
  totalFee: number;

  @ApiPropertyOptional({ example: 5.6037 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLat?: number;

  @ApiPropertyOptional({ example: -0.187 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLng?: number;

  @ApiPropertyOptional({ example: 5.556 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  dropoffLat?: number;

  @ApiPropertyOptional({ example: -0.183 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  dropoffLng?: number;
}
