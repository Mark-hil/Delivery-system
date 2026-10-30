import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

export class UpdateDeliveryDto {
  @ApiProperty({
    required: false,
    enum: [
      "searching",
      "accepted",
      "arriving",
      "pickedUp",
      "inTransit",
      "delivered",
      "cancelled",
    ],
  })
  @IsOptional()
  @IsIn([
    "searching",
    "accepted",
    "arriving",
    "pickedUp",
    "inTransit",
    "delivered",
    "cancelled",
  ])
  status?:
    | "searching"
    | "accepted"
    | "arriving"
    | "pickedUp"
    | "inTransit"
    | "delivered"
    | "cancelled";

  @ApiProperty({ required: false, description: "Rider ID to reassign" })
  @IsOptional()
  @IsString()
  riderId?: string;
}
