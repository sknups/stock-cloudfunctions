import { IsNotEmpty,IsPositive,IsInt,Min,IsOptional,IsISO8601,IsString,IsEnum } from "class-validator";

export enum Allocation {
  SEQUENTIAL = "SEQUENTIAL",
  RANDOM = "RANDOM",
}

export class SaveRequestDTO {
  /**
   * The maximum quantity available for SKU, must be a positive
   * integer
   */
  @IsPositive()
  @IsInt()
  @IsNotEmpty()
  maximum: number;

  /**
   * The maximum quantity available to purchase for SKU
   */
  @Min(0)
  @IsInt()
  @IsOptional()
  maximumForPurchase?: number | null;

  /**
   * The maximum quantity available to claim for SKU.
   */
  @Min(0)
  @IsInt()
  @IsOptional()
  maximumForClaim?: number | null;

  /**
   * The expiry date of SKU in ISO 8601 format. After this date the SKU
   * will be shown as out of stock.
   */
  @IsISO8601()
  @IsOptional()
  expires?: string | null;

  /**
   * allocation type
   * SEQUENTIAL - allocates sequential issue numbers
   * RANDOM - allocates pseudorandom issue numbers
   */
  @IsOptional()
  @IsString()
  @IsEnum(Allocation)
  allocation?: Allocation;
}
