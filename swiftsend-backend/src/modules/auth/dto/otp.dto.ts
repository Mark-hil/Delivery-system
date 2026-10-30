import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString, Length } from "class-validator";

export enum OtpPurposeEnum {
  login = "login",
  register = "register",
  resetPassword = "resetPassword",
  riderRegister = "riderRegister",
}

export class RequestOtpDto {
  @ApiProperty({
    example: "0248125567",
    description: "Email address or phone destination",
  })
  @IsNotEmpty()
  @IsString()
  destination: string;

  @ApiProperty({
    enum: OtpPurposeEnum,
    example: OtpPurposeEnum.register,
  })
  @IsEnum(OtpPurposeEnum)
  purpose: OtpPurposeEnum;
}

export class VerifyOtpDto {
  @ApiProperty({
    example: "0248125567",
    description: "Email address or phone destination",
  })
  @IsNotEmpty()
  @IsString()
  destination: string;

  @ApiProperty({
    enum: OtpPurposeEnum,
    example: OtpPurposeEnum.register,
  })
  @IsEnum(OtpPurposeEnum)
  purpose: OtpPurposeEnum;

  @ApiProperty({
    example: "1234",
    description: "4-digit verification code",
  })
  @IsNotEmpty()
  @IsString()
  @Length(4, 6)
  code: string;
}
