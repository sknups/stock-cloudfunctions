export class GetAllResponseDTO {
  constructor(sku: Map<string, number>) {
    //Needs conversion for JSON parsing
    this.sku = {};
    sku.forEach((value: number, key: string) => {
      this.sku[key] = value;
    });
  }

  sku:  { [sku: string]: number } 
}

export class  StockResponseDTO {
  constructor(sku: string, stock: number) {
    this.sku = sku;
    this.stock = stock;
  }

  sku: string;
  stock: number;
}
