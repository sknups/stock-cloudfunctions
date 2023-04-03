import { AvailableStock, IssuedStock } from "../src/persistence/stock-entity";
import {AppError, OUT_OF_STOCK} from '../src/app.errors';
import { IN_STOCK_ENTITY, OUT_OF_STOCK_ENTITY, RANDOM_ALLOCATION_ENTITY, RESERVED_ENTITY, WITHHELD_ENTITY } from "./test-data";

const repository = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  exists: jest.fn().mockImplementation((platform: string, sku: string, type :'purchase' | 'claim') => {
    if (platform != "TEST" && platform != "SKN") {
      return false;
    }

    switch (sku) {
      case IN_STOCK_ENTITY.sku:
      case RANDOM_ALLOCATION_ENTITY.sku:
      case OUT_OF_STOCK_ENTITY.sku:
        return true;
      default:
        return false;
    }
  }),
  save: jest.fn(),
  update: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  available: jest.fn(),
   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  issue: jest.fn().mockImplementation((platform: string, sku: string, type :'purchase' | 'claim') => {
    if (platform != "TEST" && platform != "SKN") {
      return null;
    }

    switch (sku) {
      case IN_STOCK_ENTITY.sku:
        return decrement(IN_STOCK_ENTITY,type);
        case RANDOM_ALLOCATION_ENTITY.sku:
        return decrement(RANDOM_ALLOCATION_ENTITY,type);
      case OUT_OF_STOCK_ENTITY.sku:
        throw new AppError(OUT_OF_STOCK(platform, sku));
      default:
        return null;
    }
  }),
  get: jest.fn().mockImplementation((platform: string, sku: string) => {
    if (platform != "TEST" && platform != "SKN") {
      return null;
    }

    switch (sku) {
      case IN_STOCK_ENTITY.sku:
        return IN_STOCK_ENTITY;
      case RANDOM_ALLOCATION_ENTITY.sku:
        return RANDOM_ALLOCATION_ENTITY;
      case OUT_OF_STOCK_ENTITY.sku:
        return OUT_OF_STOCK_ENTITY
      default:
        return null;
    }
  }),
  getAll: jest.fn().mockImplementation((platform: string) => {
    if (platform != "TEST") {
      return [];
    }
    return [IN_STOCK_ENTITY, RESERVED_ENTITY, WITHHELD_ENTITY];
  }),
};

function decrement(current: AvailableStock, type :'purchase' | 'claim'): IssuedStock {
  const newStock = { ...current};

  if (type === 'claim') {
    newStock.issued = newStock.issued + 1;
    newStock.issuedForClaim = newStock.issuedForClaim + 1; 
    newStock.availableForClaim =  newStock.maximum - newStock.issued;

    if (newStock.maximumForClaim !=null) {
      newStock.availableForClaim = newStock.maximumForClaim - newStock.issuedForClaim;
    }

    return {
      ...newStock,
     issue: newStock.issued 
    };  
  }
  
  newStock.issued = newStock.issued + 1;
  newStock.issuedForPurchase = newStock.issuedForPurchase + 1; 
  newStock.availableForPurchase =  newStock.maximum - newStock.issued;

  if (newStock.maximumForPurchase != null) {
    newStock.availableForPurchase = newStock.maximumForPurchase - newStock.issuedForPurchase;
  }
  
  return {
    ...newStock,
   issue: newStock.issued 
  };
}

export const mocks = {
  repository,
  mockClear: () => {
    repository.get.mockClear();
    repository.exists.mockClear();
    repository.save.mockClear();
    repository.update.mockClear();
    repository.set.mockClear();
    repository.delete.mockClear();
    repository.available.mockClear();
    repository.issue.mockClear();
    repository.get.mockClear();
    repository.getAll.mockClear();
  },
};

jest.mock("../src/persistence/stock-repository", () => {
  return {
    StockRepository: jest.fn().mockImplementation(() => repository),
  };
});
