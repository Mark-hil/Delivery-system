import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({ example: "ama.owusu@email.com" })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: "NewPassword123" })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword: string;

  @ApiProperty({ example: "1234", description: "Verified OTP code" })
  @IsNotEmpty()
  @IsString()
  otpCode: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
