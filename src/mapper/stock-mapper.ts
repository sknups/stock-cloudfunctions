import { StockDto } from "../dto/stock.dto";
import { AvailableStock } from "../persistence/stock-entity";

export abstract class AbstractStockMapper<T extends StockDto> {

  public toDto(entity: AvailableStock): T {
    const baseDto: StockDto = this.toBaseDto(entity);
    return this.toDtoFromBaseDto(entity, baseDto);
  }

  protected abstract toDtoFromBaseDto(entity: AvailableStock, baseDto: StockDto): T;

  private toBaseDto(entity: AvailableStock): StockDto {
    return {
      sku: entity.sku,
      platform: entity.platform,
    };
  }
}
