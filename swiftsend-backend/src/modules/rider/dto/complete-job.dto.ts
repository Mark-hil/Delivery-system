import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class CompleteJobDto {
  @ApiProperty({
    example: "1234",
    description: "4-digit receiver proof-of-delivery OTP",
  })
  @IsNotEmpty()
  @IsString()
  @Length(4, 6)
  otp: string;
}
