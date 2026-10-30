import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength, IsIn, IsOptional } from "class-validator";

export class CreateUserDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: "0241234567" })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: "Password123" })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: "John Doe" })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ enum: ["customer", "rider", "admin"] })
  @IsIn(["customer", "rider", "admin"])
  role: "customer" | "rider" | "admin";

  @ApiProperty({ required: false, enum: ["bike", "car", "van", "truck"] })
  @IsOptional()
  @IsIn(["bike", "car", "van", "truck"])
  vehicleType?: "bike" | "car" | "van" | "truck";

  @ApiProperty({ required: false, example: "GR-9821-24" })
  @IsOptional()
  @IsString()
  plateNumber?: string;
}
