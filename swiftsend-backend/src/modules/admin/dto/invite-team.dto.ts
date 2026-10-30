import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class InviteTeamDto {
  @ApiProperty({ example: "admin.support@swiftsend.app" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: "Support Admin" })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: "0245001122" })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: "AdminSecret2026" })
  @IsString()
  @MinLength(6)
  password: string;
}
