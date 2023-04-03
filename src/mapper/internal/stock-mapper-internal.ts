import { StockDto } from '../../dto/stock.dto';
import { InternalStockDto } from '../../dto/internal/stock-internal.dto';
import { AbstractStockMapper } from '../stock-mapper';
import { AvailableStock } from '../../persistence/stock-entity';

export class InternalStockMapper extends AbstractStockMapper<InternalStockDto> {

  protected toDtoFromBaseDto(entity: AvailableStock, baseDto: StockDto): InternalStockDto {    
    return {
      ...baseDto,
      issued: entity.issued,
      issuedForClaim: entity.issuedForClaim,
      issuedForPurchase: entity.issuedForPurchase,
      maximumForPurchase: entity.maximumForPurchase,
      maximumForClaim: entity.maximumForClaim,
      expires: entity.expires ?  entity.expires.toISOString() : null, 
      allocation: entity.allocation,
      maximum: entity.maximum,
      availableForPurchase: entity.availableForPurchase,
      availableForClaim: entity.availableForClaim
    }
  }
}

