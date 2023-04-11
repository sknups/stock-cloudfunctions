import { StockDto } from '../../dto/stock.dto';
import { Allocation, IssuedStock } from '../../persistence/stock-entity';
import { InternalCreateIssueDto } from '../../dto/internal/create-issue-internal.dto';
import { InternalStockMapper } from './stock-mapper-internal';
import { RandomIssuePicker } from '../../helpers/random-issue-picker';

export class InternalIssueCreatedStockMapper extends InternalStockMapper {

 
  protected toDtoFromBaseDto(entity: IssuedStock, baseDto: StockDto): InternalCreateIssueDto {

    const stockDto = super.toDtoFromBaseDto(entity, baseDto);

    return {
      ...stockDto,
      issue: this.getIssue(entity),
    }

  }

  private getIssue(entity: IssuedStock): number {
    const {sku, maximum, allocation, issued} = entity;

    switch(allocation) { 
      case Allocation.SEQUENTIAL: { 
        return issued;
      } 
      
      case Allocation.RANDOM: { 
        return new RandomIssuePicker().issue(maximum, sku, issued)
      } 

      default: { 
        throw new Error(`Unknown issue allocation type '${allocation}'`)
      } 
    } 
  }
}
