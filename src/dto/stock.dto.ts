export class StockDto {
  /**
   * SKU code that stock relates to
   */
  sku: string;

  /**
   * SKU code that stock relates to
   */
  platform: string;

  /**
   * The advertised available stock 
   * @deprecated use available
   */
  stock: number;

  /**
   *The advertised available stock
   */
  available: number;
}
