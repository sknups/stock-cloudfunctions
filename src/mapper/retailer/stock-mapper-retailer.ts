import { RetailerStockDto } from '../../dto/retailer/stock-retailer.dto';
import { StockDto } from '../../dto/stock.dto';
import { AvailableStock } from '../../persistence/stock-entity';
import { AbstractStockMapper } from '../stock-mapper';

export class RetailerStockMapper extends AbstractStockMapper<StockDto> {

  protected toDtoFromBaseDto(entity: AvailableStock, baseDto: StockDto): RetailerStockDto {
    return {
      ...baseDto,
      available: entity.availableForPurchase,
      stock: entity.availableForPurchase,
    };
  }

}

