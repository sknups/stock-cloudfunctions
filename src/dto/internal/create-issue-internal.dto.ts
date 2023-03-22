import { InternalStockDto } from './stock-internal.dto';

export class InternalCreateIssueDto extends InternalStockDto {

  /**
   * The issue number that should be used by the item
   */
  issue: number;
}