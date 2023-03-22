import { StockDto } from '../../dto/stock.dto';
import { InternalStockDto } from '../../dto/internal/stock-internal.dto';
import { AvailableStock } from '../../persistence/stock-entity';
import { AbstractStockMapper } from '../stock-mapper';

export class InternalStockMapper extends AbstractStockMapper<InternalStockDto> {

  protected toDtoFromBaseDto(entity: AvailableStock, baseDto: StockDto): InternalStockDto {    
    return {
      ...baseDto,
      issued: entity.issued,
      reserved: entity.reservedForClaim,
      withheld: entity.withheld,
      expires: entity.expires ?  entity.expires.toISOString() : null, 
      allocation: entity.allocation,
      maximum: entity.maximum
    }
  }
}

