import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class CustomerRegisterDto {
  @ApiProperty({ example: "Ama Owusu", description: "Full name" })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: "0248125567", description: "Phone number" })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: "ama.owusu@email.com", description: "Email address" })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: "Password1", description: "Password" })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
