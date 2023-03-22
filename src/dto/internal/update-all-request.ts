import { IsInt, Min, IsOptional } from "class-validator";
import { SaveRequestDTO } from "./save-stock-request";


export class UpdateAllRequestDTO extends SaveRequestDTO {

  @Min(0)
  @IsInt()
  @IsOptional()
  issued: number;
}

