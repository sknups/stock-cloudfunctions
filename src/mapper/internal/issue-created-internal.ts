import { StockDto } from '../../dto/stock.dto';
import { Allocation, IssuedStock } from '../../persistence/stock-entity';
import { InternalCreateIssueDto } from '../../dto/internal/create-issue-internal.dto';
import { InternalStockMapper } from './stock-mapper-internal';
import * as shuffle from 'fisher-yates-shuffle';
import * as seedrandom from 'seedrandom';

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
        const issues = Array.from({length: maximum}, (_, index) => index + 1);
        return shuffle(issues, seedrandom(sku))[issued-1]
      } 

      default: { 
        throw new Error(`Unknown issue allocation type '${allocation}'`)
      } 
    } 
  }
}
