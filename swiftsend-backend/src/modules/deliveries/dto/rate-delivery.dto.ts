import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class RateDeliveryDto {
  @ApiProperty({ example: 5, description: "Rating from 1 to 5 stars" })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  stars: number;

  @ApiPropertyOptional({ example: "Very fast and polite rider!", description: "Optional review feedback" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
