import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty } from "class-validator";

export class ToggleStatusDto {
  @ApiProperty({ example: true, description: "Whether the rider is available to receive jobs" })
  @IsNotEmpty()
  @IsBoolean()
  isOnline: boolean;
}
