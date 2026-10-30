import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { VehicleTypeEnum } from "../../auth/dto/rider-register.dto.js";

export class EstimateDeliveryDto {
  @ApiProperty({ example: "Airport Residential Area, Accra" })
  @IsNotEmpty()
  @IsString()
  pickupAddress: string;

  @ApiProperty({ example: "Osu Oxford Street, Accra" })
  @IsNotEmpty()
  @IsString()
  dropoffAddress: string;

  @ApiProperty({ enum: VehicleTypeEnum, example: VehicleTypeEnum.bike })
  @IsEnum(VehicleTypeEnum)
  vehicleType: VehicleTypeEnum;

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
