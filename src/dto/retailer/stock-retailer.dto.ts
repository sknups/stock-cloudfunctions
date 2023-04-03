import { StockDto } from '../stock.dto';

/**
 * Extension of StockDto for retailers consumption.
 */
export class RetailerStockDto extends StockDto {
   /**
   * The advertised available stock 
   * @deprecated use available
   */
  stock: number;

  /**
   * The advertised available stock for
   * purchase
   */
  available: number;
}