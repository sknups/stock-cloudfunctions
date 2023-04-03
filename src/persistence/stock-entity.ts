export enum Allocation {
  SEQUENTIAL = "SEQUENTIAL",
  RANDOM = "RANDOM",
}

export type IssuedStock = AvailableStock & {
  issue: number
}

export type StockEntity = BaseStockEntity & {
  issued: number;
  issuedForClaim: number;
  issuedForPurchase: number;
};

export type AvailableStock = StockEntity & {
  availableForPurchase: number;
  availableForClaim: number;
};

export type BaseStockEntity = UpdateStockEntity & {
  maximum: number;
  allocation: Allocation;
};

export type UpdateStockEntity = {
  sku: string;
  platform: string;
  maximumForClaim: number | null;
  maximumForPurchase: number | null;
  expires: Date | null;
};
