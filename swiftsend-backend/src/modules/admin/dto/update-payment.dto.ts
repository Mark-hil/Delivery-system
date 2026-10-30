import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty } from "class-validator";

export class UpdatePaymentDto {
  @ApiProperty({ enum: ["Paid", "Pending", "Failed"] })
  @IsIn(["Paid", "Pending", "Failed"])
  @IsNotEmpty()
  status: "Paid" | "Pending" | "Failed";
}
