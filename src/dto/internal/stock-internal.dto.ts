import { StockDto } from '../stock.dto';

/**
 * Extension of StockDto to provide additional fields for internal consumption.
 * 
 * This is intended to be exposed to other internal SKNUPS services.
 * 
 * It MUST NOT be exposed to retailers over retailer API.
 */
export class InternalStockDto extends StockDto {

  /**
   * The the number of items issued
   */
  issued: number

  /**
  * The maximum for SKU 
  */
  maximum: number;

  /**
   * remaining reserved for claims
   */
  reserved: number;

  /**
  * the withheld quantity
  */
  withheld: number;

  /**
   * The expiry date of SKU in ISO 8601 format. After this date the SKU
   * will be shown as out of stock.
   */
  expires: string | null;

  /**
   * allocation type
   * SEQUENTIAL - allocates sequential issue numbers
   * RANDOM - allocates pseudorandom issue numbers
   */
  allocation: string;
}