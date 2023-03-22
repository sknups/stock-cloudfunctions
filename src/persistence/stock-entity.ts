export enum Allocation {
  SEQUENTIAL = "SEQUENTIAL",
  RANDOM = "RANDOM",
}

export type IssuedStock = AvailableStock & {
  issue: number
}

export type StockEntity = BaseStockEntity & {
  issued: number;
};

export type AvailableStock = StockEntity & {
  available: number;
};

export type BaseStockEntity = UpdateStockEntity & {
  maximum: number;
  allocation: Allocation;
};

export type UpdateStockEntity = {
  sku: string;
  platform: string;
  reservedForClaim: number;
  withheld: number;
  expires: Date | null;
};
