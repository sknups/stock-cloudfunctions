import { IsNotEmpty, IsIn, IsString, IsPositive, IsInt } from "class-validator";

export enum OPERATION {
  RESET = "RESET",
  CREATE = "CREATE",
}

export class CreateRequestDTO {
  /**
   * The SKU to set inventory for.
   */
  @IsString()
  @IsNotEmpty()
  sku: string;

  /**
   * Operation type.
   * CREATE - If inventory only exists in Redis no action to be taken
   * RESET - Sets inventory even if inventory exists in Redis
   */
  @IsString()
  @IsIn([OPERATION.RESET, OPERATION.CREATE])
  operation: string;

  /**
   * The maximum quantity available for SKU, must be a positive
   * integer
   */
  @IsPositive()
  @IsInt()
  @IsNotEmpty()
  maxQty: number;
}
