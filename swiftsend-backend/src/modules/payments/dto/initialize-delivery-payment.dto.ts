import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class InitializeDeliveryPaymentDto {
  @ApiProperty({ example: "d7f6b8b0-8488-4660-84c1-654817a3a291", description: "Delivery order ID" })
  @IsNotEmpty()
  @IsUUID()
  deliveryId: string;

  @ApiPropertyOptional({ example: "https://myswiftsend.app/customer/orders" })
  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
