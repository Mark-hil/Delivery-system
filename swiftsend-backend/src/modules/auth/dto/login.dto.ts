import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({
    example: "ama.owusu@email.com",
    description: "Email address or phone number",
  })
  @IsNotEmpty()
  @IsString()
  identifier: string;

  @ApiProperty({
    example: "Password1",
    description: "Account password",
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
