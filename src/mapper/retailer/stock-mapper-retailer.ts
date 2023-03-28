import { StockDto } from '../../dto/stock.dto';
import { AvailableStock } from '../../persistence/stock-entity';
import { AbstractStockMapper } from '../stock-mapper';

export class RetailerStockMapper extends AbstractStockMapper<StockDto> {

  protected toDtoFromBaseDto(entity: AvailableStock, baseDto: StockDto): StockDto {
    return baseDto;
  }

}

