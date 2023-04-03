import { IN_STOCK_ENTITY, RANDOM_ALLOCATION_ENTITY } from '../../test-data';
import { InternalIssueCreatedStockMapper } from "../../../src/mapper/internal/issue-created-internal";


let instance : InternalIssueCreatedStockMapper;

describe("mapper - internal - issue-create", () => {

  beforeEach(function () {
    instance = new InternalIssueCreatedStockMapper();
  });

  it("creates correct response", async () => {
    const dto = instance.toDto({
       ...IN_STOCK_ENTITY,
       issued: 1,
    }); 
    
    expect(dto).toEqual({
        allocation: "SEQUENTIAL",
        availableForClaim: 0,
        availableForPurchase: 990,
        expires: null,
        issue: 1,
        issued: 1,
        issuedForClaim: 0,
        issuedForPurchase: 10,
        maximum: 1000,
        maximumForClaim: 0,
        maximumForPurchase: 1000,
        platform: "TEST",
        sku: "SKU_001",
    });
  });

  it("supports random issue numbers", async () => {
    
    const entity ={
      ...RANDOM_ALLOCATION_ENTITY,
      maximum: 10,
      issued: 1,
   }

   const issues = [] as string[];

    for (let i=0; i < 10; i++){
    const dto = instance.toDto({
      ...entity,
      issued: i+1
    }); 
    issues.push(dto["issue"]);

  }
    
  expect(issues).toEqual([9,4,5,3,7,2,1,6,8,10]);

  });


});
