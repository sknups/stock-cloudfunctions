import { IN_STOCK_ENTITY, RANDOM_ALLOCATION_ENTITY } from '../../test-data';
import { InternalIssueCreatedStockMapper } from "../../../src/mapper/internal/issue-created-internal";
import { Allocation } from '../../../src/dto/internal/save-stock-request';


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

  it("supports RANDOM issue numbers", async () => {
    
    const maximum = 100;

    const entity ={
      ...IN_STOCK_ENTITY,
      allocation: Allocation.RANDOM,
      maximum,
    }

    const issues = [] as string[];

    for (let i=0; i < maximum; i++){
      const dto = instance.toDto({
        ...entity,
        issued: i+1
      }); 
      issues.push(dto["issue"]);
    }
    
    expect(issues.length).toEqual(maximum)
    expect(issues).toEqual([1,15,2,19,98,93,52,67,27,70,30,74,81,85,40,7,59,57,90,75,42,6,12,72,84,64,99,91,54,49,76,16,55,82,23,11,32,39,24,48,34,45,53,89,87,61,22,20,14,56,69,73,10,41,80,3,33,63,77,50,100,38,71,94,86,9,66,51,28,8,47,26,65,31,46,68,17,5,62,83,88,43,18,78,97,35,29,96,36,25,92,4,44,21,58,79,60,37,95,13]);

  });

  it("supports SEQUENTIAL issue numbers", async () => {
    
    const maximum = 100;

    const entity ={
      ...IN_STOCK_ENTITY,
      allocation: Allocation.SEQUENTIAL,
      maximum,
    }

    const issues = [] as string[];

    for (let i=0; i < maximum; i++){
      const dto = instance.toDto({
        ...entity,
        issued: i+1
      }); 
      issues.push(dto["issue"]);
    }
    
    expect(issues.length).toEqual(maximum)
    expect(issues).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100]);

  });


});
