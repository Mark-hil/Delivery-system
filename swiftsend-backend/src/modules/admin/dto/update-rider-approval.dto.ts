import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty } from "class-validator";

export class UpdateRiderApprovalDto {
  @ApiProperty({ enum: ["Pending", "Approved", "Suspended"] })
  @IsIn(["Pending", "Approved", "Suspended"])
  @IsNotEmpty()
  status: "Pending" | "Approved" | "Suspended";
}
