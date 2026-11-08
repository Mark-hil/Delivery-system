import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class InitializeTopupDto {
  @ApiProperty({ example: 50.0, description: "Amount in Ghana Cedis (GHS) to add to wallet" })
  @IsNotEmpty()
  @IsNumber()
  @Min(1.0, { message: "Minimum top-up amount is GHS 1.00" })
  amount: number;

  @ApiPropertyOptional({ example: "https://myswiftsend.app/customer/wallet" })
  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
