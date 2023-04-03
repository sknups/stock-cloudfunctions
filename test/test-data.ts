import { Allocation, AvailableStock } from "../src/persistence/stock-entity";

export const IN_STOCK_ENTITY = {
    sku: 'SKU_001',
    platform: 'TEST',
    expires: null,
    maximum: 1000,
    maximumForClaim: 0,
    maximumForPurchase: 1000,
    allocation: Allocation.SEQUENTIAL,
    issued: 10,
    issuedForClaim: 0,
    issuedForPurchase: 10,
    availableForPurchase: 990,
    availableForClaim: 0  
} as AvailableStock

export const RESERVED_ENTITY = {
    sku: 'SKU_002',
    platform: 'TEST',
    expires: null,
    maximum: 1000,
    maximumForClaim: 100,
    maximumForPurchase: 900,
    allocation: Allocation.SEQUENTIAL,
    issued: 10,
    issuedForClaim: 0,
    issuedForPurchase: 10,
    availableForPurchase: 890,
    availableForClaim: 100,
} as AvailableStock

export const WITHHELD_ENTITY = {
    sku: 'SKU_003',
    platform: 'TEST',
    expires: null,
    maximum: 1000,
    maximumForClaim: 0,
    maximumForPurchase: 800,
    allocation: Allocation.SEQUENTIAL,
    issued: 10,
    issuedForClaim: 0,
    issuedForPurchase: 10,
    availableForPurchase: 790,
    availableForClaim:0,  
} as AvailableStock


export const RANDOM_ALLOCATION_ENTITY = {
    sku: 'SKU_004',
    platform: 'TEST',
    expires: null,
    maximum: 10,
    maximumForClaim: 1,
    maximumForPurchase: 9,
    allocation: Allocation.RANDOM,
    issued: 0,
    issuedForClaim: 0,
    issuedForPurchase: 0,
    availableForPurchase: 9,
    availableForClaim: 1,  
} as AvailableStock

export const OUT_OF_STOCK_ENTITY = {
    sku: 'SKU_005',
    platform: 'TEST',
    expires: null,
    maximum: 1000,
    maximumForClaim: 0,
    maximumForPurchase: 800,
    allocation: Allocation.RANDOM,
    issued: 800,
    issuedForClaim: 0,
    issuedForPurchase: 800,
    availableForPurchase: 0,  
    availableForClaim: 0,  
} as AvailableStock
