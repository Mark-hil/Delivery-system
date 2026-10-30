import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty } from "class-validator";

export class UpdateUserStatusDto {
  @ApiProperty({ enum: ["Active", "Suspended"] })
  @IsIn(["Active", "Suspended"])
  @IsNotEmpty()
  status: "Active" | "Suspended";
}
