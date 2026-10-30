import { ApiProperty } from "@nestjs/swagger";
import { IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { RiderDocumentDto } from "../../auth/dto/rider-register.dto.js";

export class ResubmitDocumentsDto {
  @ApiProperty({ type: [RiderDocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RiderDocumentDto)
  documents: RiderDocumentDto[];
}
