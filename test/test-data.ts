import { Allocation, AvailableStock } from "../src/persistence/stock-entity";

export const IN_STOCK_ENTITY = {
    sku: 'SKU_001',
    platform: 'SKN',
    reservedForClaim: 0,
    withheld: 0,
    expires: null,
    maximum: 1000,
    allocation: Allocation.SEQUENTIAL,
    issued: 10,
    available: 990  
} as AvailableStock

export const RESERVED_ENTITY = {
    sku: 'SKU_002',
    platform: 'SKN',
    reservedForClaim: 100,
    withheld: 0,
    expires: null,
    maximum: 1000,
    allocation: Allocation.SEQUENTIAL,
    issued: 10,
    available: 890  
} as AvailableStock

export const WITHHELD_ENTITY = {
    sku: 'SKU_003',
    platform: 'SKN',
    reservedForClaim: 0,
    withheld: 200,
    expires: null,
    maximum: 1000,
    allocation: Allocation.SEQUENTIAL,
    issued: 10,
    available: 790  
} as AvailableStock


export const RANDOM_ALLOCATION_ENTITY = {
    sku: 'SKU_004',
    platform: 'SKN',
    reservedForClaim: 0,
    withheld: 200,
    expires: null,
    maximum: 1000,
    allocation: Allocation.RANDOM,
    issued: 0,
    available: 790  
} as AvailableStock

export const OUT_OF_STOCK_ENTITY = {
    sku: 'SKU_005',
    platform: 'SKN',
    reservedForClaim: 0,
    withheld: 200,
    expires: null,
    maximum: 1000,
    allocation: Allocation.RANDOM,
    issued: 790,
    available: 790  
} as AvailableStock
