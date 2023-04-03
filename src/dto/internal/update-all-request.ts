import { IsInt, Min } from "class-validator";
import { SaveRequestDTO } from "./save-stock-request";


export class UpdateAllRequestDTO extends SaveRequestDTO {

  @Min(0)
  @IsInt()
  issued: number;

  @Min(0)
  @IsInt()
  issuedForClaim: number;

  @Min(0)
  @IsInt()
  issuedForPurchase: number;
}

