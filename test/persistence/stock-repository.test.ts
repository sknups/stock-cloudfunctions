import { AllConfig, loadConfig } from "../../src/config/all-config";
import { testEnv } from "../test-env";
import { StockRepository } from "../../src/persistence/stock-repository";
import { Allocation, StockEntity } from "../../src/persistence/stock-entity";
import Redis from "ioredis-mock";

jest.mock("ioredis", () => jest.requireActual("ioredis-mock"));

const defaultValues = {
  sku: 'SKU_REPOSITORY_TEST',
  platform: 'SKN',
  maximum: 100,
  allocation: Allocation.SEQUENTIAL,
  expires: null,
  issued: 0,
  issuedForClaim: 0,
  issuedForPurchase: 0,
  maximumForClaim: 20,
  maximumForPurchase: 80
} as StockEntity;

const SKU_REPOSITORY_TEST = {
    allocation: "SEQUENTIAL",
    availableForClaim: 20,
    availableForPurchase: 80,
    expires: null,
    issued: 0,
    issuedForClaim: 0,
    issuedForPurchase: 0,
    maximum: 100,
    maximumForClaim: 20,
    maximumForPurchase: 80,
    platform: "SKN",
    sku: "SKU_REPOSITORY_TEST",
}

StockRepository.redis = new Redis();
let instance: StockRepository;

function key(platform = 'SKN', sku = 'SKU_REPOSITORY_TEST') : string {
  return `stock:${platform}:${sku}`;
}

async function createRedisEntry(entry = defaultValues): Promise<void> {
  const {platform, sku} = entry;

  await StockRepository.redis.hset(
    key(platform, sku),
    "maximum",
    `${entry.maximum}`,
    "allocation",
    `${entry.allocation.toString()}`,
    "maximumForClaim",
    `${entry.maximumForClaim == null ? "" : entry.maximumForClaim}`,
    "maximumForPurchase",
    `${entry.maximumForPurchase == null ? "" : entry.maximumForPurchase}`,
    "expires",
    `${entry.expires == null ? "" : entry.expires.getTime()}`,
    "issued",
    `${entry.issued}`,
    "issuedForClaim",
    `${entry.issuedForClaim}`,
    "issuedForPurchase",
    `${entry.issuedForPurchase}`
  );
}

describe("repository - stock", () => {
  beforeEach(async () => {
    const CONFIG: AllConfig = await loadConfig(testEnv);
    instance = new StockRepository(CONFIG);
  });

  afterEach((done) => {
    StockRepository.redis.flushall().then(() => done());
  });


  describe("exists", () => {
    beforeEach(async () => {
      await createRedisEntry();
    });
    it("returns true if data exists for platform and sku", async () => {
      const {platform, sku} = defaultValues;
      expect(instance.exists(platform, sku)).resolves.toBe(true);
    });

    it("returns false if platform does not match", async () => {
      const {sku} = defaultValues;
      expect(instance.exists("OTHER", sku)).resolves.toBe(false);
    });

    it("returns false if sku does not match", async () => {
      const {platform} = defaultValues;
      expect(instance.exists(platform, "UNKNOWN")).resolves.toBe(false);
    });
  });

  describe("save", () => {
    describe("update existing record", () => {

      beforeEach(async () => {
        await createRedisEntry();
      });

      it("asserts that maximum cant be changed for existing entry", async () => {
        await expect(
          instance.save({
            ...defaultValues,
            maximum: 1000,
          })
        ).rejects.toThrow(
          "Invalid save of property 'maximum' can't be changed. SKN, SKU_REPOSITORY_TEST"
        );
      });

      it("asserts that allocation can not be changed for existing entry", async () => {
        await expect(
          instance.save({
            ...defaultValues,
            allocation: Allocation.RANDOM,
          })
        ).rejects.toThrow(
          "Invalid save of property 'allocation' can't be changed. SKN, SKU_REPOSITORY_TEST"
        );
      });

      it("asserts that maximumForClaim can be changed for existing entry", async () => {
        await instance.save({
          ...defaultValues,
          maximumForClaim: 10,
        });
 
        expect(
          StockRepository.redis.hget(key(), "maximumForClaim")
        ).resolves.toBe(10);
      });

      it("asserts that maximumForClaim can't be over overall maximum", async () => {
        await instance.save({
          ...defaultValues,
          maximumForClaim: 21,
        });
 
        expect(
          StockRepository.redis.hget(key(), "maximumForClaim")
        ).resolves.toBe("20");
      });

      it("asserts that maximumForClaim can't be larger than issuedForClaim", async () => {
        await StockRepository.redis.hset(key(), "issuedForClaim", 15)

        await instance.save({
          ...defaultValues,
          maximumForClaim: 14,
        });
 
        expect(
          StockRepository.redis.hget(key(), "maximumForClaim")
        ).resolves.toBe("20");
      });

      it("asserts that maximumForClaim can be null", async () => {
        await instance.save({
          ...defaultValues,
          maximumForClaim: null,
        });
 
        expect(
          StockRepository.redis.hget(key(), "maximumForClaim")
        ).resolves.toBe("");
      });

      it("asserts that maximumForClaim can be zero", async () => {
        await instance.save({
          ...defaultValues,
          maximumForClaim: 0,
        });
 
        expect(
          StockRepository.redis.hget(key(), "maximumForClaim")
        ).resolves.toBe(0);
      });

      it("asserts that maximumForPurchase can be changed for existing entry", async () => {
        await instance.save({
          ...defaultValues,
          maximumForPurchase: 19,
        });

        expect(StockRepository.redis.hget(key(), "maximumForPurchase")).resolves.toBe(19);
      });

      it("asserts that maximumForPurchase can't be over overall maximum", async () => {
        await instance.save({
          ...defaultValues,
          maximumForPurchase: 81,
        });

        expect(StockRepository.redis.hget(key(), "maximumForPurchase")).resolves.toBe("80");
      });

      it("asserts that maximumForPurchase can't be larger than issuedForPurchase", async () => {
        await StockRepository.redis.hset(key(), "issuedForPurchase", 15)

        await instance.save({
          ...defaultValues,
          maximumForPurchase: 14,
        });
 
        expect(
          StockRepository.redis.hget(key(), "maximumForPurchase")
        ).resolves.toBe("80");
      });

      it("asserts that maximumForPurchase can be null", async () => {
        await instance.save({
          ...defaultValues,
          maximumForPurchase: null,
        });

        expect(StockRepository.redis.hget(key(), "maximumForPurchase")).resolves.toBe("");
      });

      it("asserts that maximumForPurchase can be zero", async () => {
        await instance.save({
          ...defaultValues,
          maximumForPurchase: 0,
        });

        expect(StockRepository.redis.hget(key(), "maximumForPurchase")).resolves.toBe(0);
      });

      it("asserts that expires can be changed for existing entry", async () => {
        await instance.save({
          ...defaultValues,
          expires: new Date("2023-03-20T18:59:58Z"),
        });

        expect(StockRepository.redis.hget(key(), "expires")).resolves.toBe(
          1679338798000
        );
      });
    });

    describe("insert new record", () => {
      it("sets hget fields in redis", async () => {
        await instance.save(defaultValues);

        expect(await StockRepository.redis.hget(key(), "maximum")).toEqual(
          `${defaultValues.maximum}`
        );
        expect(await StockRepository.redis.hget(key(), "allocation")).toEqual(
          `${defaultValues.allocation}`
        );
        expect(
          await StockRepository.redis.hget(key(), "maximumForPurchase")
        ).toEqual(`${defaultValues.maximumForPurchase}`);

        expect(await StockRepository.redis.hget(key(), "maximumForClaim")).toEqual(
          `${defaultValues.maximumForClaim}`
        );
        expect(await StockRepository.redis.hget(key(), "expires")).toEqual(
          ``
        );
        expect(await StockRepository.redis.hget(key(), "issued")).toEqual(
          `${defaultValues.issued}`
        );
        expect(await StockRepository.redis.hget(key(), "issuedForClaim")).toEqual(
          `${defaultValues.issuedForClaim}`
        );
        expect(await StockRepository.redis.hget(key(), "issuedForPurchase")).toEqual(
          `${defaultValues.issuedForPurchase}`
        );
      });

      it("returns available stock", async () => {
        const result = await instance.save(defaultValues);
        expect(result).toEqual(SKU_REPOSITORY_TEST);
      });
    });
  });


  describe("set", () => {
    beforeEach(async () => {
      await createRedisEntry();
    });

    describe("update existing record", () => {
      it("asserts that maximum can be changed for existing entry", async () => {
        await instance.set({
          ...defaultValues,
          maximum: 1000,
        })
        expect(StockRepository.redis.hget(key(), "maximum")).resolves.toBe(
          "1000"
        );
      });

      it("asserts that allocation can be changed for existing entry", async () => {
        await instance.set({
          ...defaultValues,
          allocation: Allocation.RANDOM,
        })
        expect(StockRepository.redis.hget(key(), "allocation")).resolves.toBe(
          Allocation.RANDOM
        );
      });

      it("asserts that maximumForClaim can be changed for existing entry", async () => {
        await instance.set({
          ...defaultValues,
          maximumForClaim: 9,
        });

        expect(
          StockRepository.redis.hget(key(), "maximumForClaim")
        ).resolves.toBe("9");
      });

      it("asserts that maximumForClaim can't be over overall maximum", async () => {
        await instance.save({
          ...defaultValues,
          maximumForClaim: 21,
        });
 
        expect(
          StockRepository.redis.hget(key(), "maximumForClaim")
        ).resolves.toBe("20");
      });

      it("asserts that maximumForClaim can be null", async () => {
        await instance.save({
          ...defaultValues,
          maximumForClaim: null,
        });
 
        expect(
          StockRepository.redis.hget(key(), "maximumForClaim")
        ).resolves.toBe('');
      });

      it("asserts that maximumForClaim can be zero", async () => {
        await instance.save({
          ...defaultValues,
          maximumForClaim: 0,
        });
 
        expect(
          StockRepository.redis.hget(key(), "maximumForClaim")
        ).resolves.toBe(0);
      });

      it("asserts that maximumForPurchase can be changed for existing entry", async () => {
        await instance.set({
          ...defaultValues,
          maximumForPurchase: 23,
        });

        expect(StockRepository.redis.hget(key(), "maximumForPurchase")).resolves.toBe("23");
      });

      it("asserts that maximumForPurchase can't be over overall maximum", async () => {
        await instance.save({
          ...defaultValues,
          maximumForPurchase: 81,
        });
 
        expect(
          StockRepository.redis.hget(key(), "maximumForPurchase")
        ).resolves.toBe("80");
      });

      it("asserts that maximumForPurchase can be null", async () => {
        await instance.save({
          ...defaultValues,
          maximumForPurchase: null,
        });
 
        expect(
          StockRepository.redis.hget(key(), "maximumForPurchase")
        ).resolves.toBe('');
      });

      it("asserts that maximumForPurchase can be zero", async () => {
        await instance.save({
          ...defaultValues,
          maximumForPurchase: 0,
        });
 
        expect(
          StockRepository.redis.hget(key(), "maximumForPurchase")
        ).resolves.toBe(0);
      });


      it("asserts that expires can be changed for existing entry", async () => {
        await instance.set({
          ...defaultValues,
          expires: new Date("2023-03-20T18:59:58Z"),
        });

        expect(StockRepository.redis.hget(key(), "expires")).resolves.toBe(
          "1679338798000"
        );
      });

      it("asserts that issued can be changed for existing entry", async () => {
        await instance.set({
          ...defaultValues,
          issued: 13,
        });

        expect(StockRepository.redis.hget(key(), "issued")).resolves.toBe(
          "13"
        );
      });

      it("asserts that issuedForClaim can be changed for existing entry", async () => {
        await instance.set({
          ...defaultValues,
          issued: 13,
          issuedForClaim: 13,
        });

        expect(StockRepository.redis.hget(key(), "issuedForClaim")).resolves.toBe(
          "13"
        );
      });

      it("asserts that issuedForPurchase can be changed for existing entry", async () => {
        await instance.set({
          ...defaultValues,
          issued: 11,
          issuedForPurchase: 11,
        });

        expect(StockRepository.redis.hget(key(), "issuedForPurchase")).resolves.toBe(
          "11"
        );
      });


      it("asserts that sum of issuedForClaim and issuedForPurchase can't be larger than issued", async () => {
        await expect(
          instance.set({
            ...defaultValues,
            issued: 20,
            issuedForClaim: 11,
            issuedForPurchase: 11,
          })
        ).rejects.toThrow("Sum of issuedForClaim (11) and issuedForPurchase (11) is greater than issued (20). platform: SKN, sku SKU_REPOSITORY_TEST");
      });
    });

    describe("insert new record", () => {
      it("sets hget fields in redis", async () => {
        await instance.set(defaultValues);

        expect(await StockRepository.redis.hget(key(), "maximum")).toEqual(
          `${defaultValues.maximum}`
        );
        expect(await StockRepository.redis.hget(key(), "allocation")).toEqual(
          `${defaultValues.allocation}`
        );
        expect(
          await StockRepository.redis.hget(key(), "issuedForClaim")
        ).toEqual(`${defaultValues.issuedForClaim}`);

        expect(await StockRepository.redis.hget(key(), "issuedForPurchase")).toEqual(
          `${defaultValues.issuedForPurchase}`
        );
        expect(
          await StockRepository.redis.hget(key(), "maximumForClaim")
        ).toEqual(`${defaultValues.maximumForClaim}`);

        expect(await StockRepository.redis.hget(key(), "maximumForPurchase")).toEqual(
          `${defaultValues.maximumForPurchase}`
        );
        expect(await StockRepository.redis.hget(key(), "expires")).toEqual(
          ''
        );
        expect(await StockRepository.redis.hget(key(), "issued")).toEqual(
          '0'
        );
      });

      it("returns available stock", async () => {
        const result = await instance.set(defaultValues);
        expect(result).toEqual(SKU_REPOSITORY_TEST);
      });
    });
  });

  describe("delete", () => {
    beforeEach(async () => {
      await createRedisEntry();
    });

    it("asserts that it throws an exception if sku does not exist", async () => {
        const {platform} = defaultValues;
        await expect(
          instance.delete(platform, "UNKNOWN")
        ).rejects.toThrow("Stock not found. 'SKN', 'UNKNOWN'");
    });

    it("asserts that it deletes all the redis data", async () => {
      const {platform, sku} = defaultValues;
      let values = await StockRepository.redis.hgetall(key());

      expect(values).toEqual({
        "allocation": "SEQUENTIAL",
        "expires": "",
        "issued": "0",
        "issuedForClaim": "0",
        "issuedForPurchase": "0",
        "maximum": "100",
        "maximumForClaim": "20",
        "maximumForPurchase": "80",
      });

      await instance.delete(platform, sku);
   
      values = await StockRepository.redis.hgetall(key());

      expect(values).toEqual({});
   });

  });

  describe("available", () => {
  
    describe("purchase", () => {

      it("asserts that null is returned if sku does not exist", async () => {
          await createRedisEntry();
        
          const {platform} = defaultValues;
          const result = await instance.available(platform, "UNKNOWN","purchase");
          expect(result).toBeNull();
      });

      it("asserts that it returns available count", async () => {
        await createRedisEntry();

        const {platform, sku} = defaultValues;
        const result = await instance.available(platform, sku,"purchase");
        expect(result).toEqual(80);
      });

      it("asserts that it uses maximumForPurchase from available count if set", async () => {
        await createRedisEntry({
          ...defaultValues,
          maximumForPurchase: 50,
        });

        const {platform, sku} = defaultValues;
        const result = await instance.available(platform, sku,"purchase");
        expect(result).toEqual(50);
      });

      it("asserts that it uses maximum if maximumForPurchase null", async () => {
        await createRedisEntry({
          ...defaultValues,
          maximum: 100,
          maximumForPurchase: null,
        });

        const {platform, sku} = defaultValues;
        const result = await instance.available(platform, sku,"purchase");
        expect(result).toEqual(100);
      });

      it("asserts that it removes issuedForPurchase from available count", async () => {
        await createRedisEntry({
          ...defaultValues,
          issuedForPurchase:50
        });

        const {platform, sku} = defaultValues;
        const result = await instance.available(platform, sku,"purchase");
        expect(result).toEqual(30);
      });

      it("asserts that it removes issued from available count if maximumForPurchase is null", async () => {
        await createRedisEntry({
          ...defaultValues,
          maximum: 100,
          issued: 20,
          maximumForPurchase: null,
          issuedForPurchase:50
        });

        const {platform, sku} = defaultValues;
        const result = await instance.available(platform, sku,"purchase");
        expect(result).toEqual(80);
      });

      it("asserts that it uses overall availability if lower", async () => {
        await createRedisEntry({
          ...defaultValues,
          issued:90
        });

        const {platform, sku} = defaultValues;
        const result = await instance.available(platform, sku,"purchase");
        expect(result).toEqual(10);
      });


      it("asserts that if expires is in the future it has no effect", async () => {
        
        await createRedisEntry({
          ...defaultValues,
          expires: new Date(new Date().getTime()+1000)
        });

        const {platform, sku} = defaultValues;
        const result = await instance.available(platform, sku,"purchase");
        expect(result).toEqual(80);
      });

      it("asserts that if expires is in the past zero is returned", async () => {
        
        await createRedisEntry({
          ...defaultValues,
          expires: new Date(new Date().getTime()-1000)
        });

        const {platform, sku} = defaultValues;
        const result = await instance.available(platform, sku,"purchase");
        expect(result).toEqual(0);
      });
  });   

 
  describe("claim", () => {

    it("asserts that null is returned if sku does not exist", async () => {
        await createRedisEntry();
      
        const {platform} = defaultValues;
        const result = await instance.available(platform, "UNKNOWN","claim");
        expect(result).toBeNull();
    });

    it("asserts that it returns available count", async () => {
      await createRedisEntry();

      const {platform, sku} = defaultValues;
      const result = await instance.available(platform, sku,"claim");
      expect(result).toEqual(20);
    });

    it("asserts that it uses maximumForClaim from available count", async () => {
      await createRedisEntry({
        ...defaultValues,
        maximumForClaim:10
      });

      const {platform, sku} = defaultValues;
      const result = await instance.available(platform, sku,"claim");
      expect(result).toEqual(10);
    });

    it("asserts that it uses maximum if maximumForPurchase null", async () => {
      await createRedisEntry({
        ...defaultValues,
        maximum: 100,
        maximumForClaim: null,
      });

      const {platform, sku} = defaultValues;
      const result = await instance.available(platform, sku,"claim");
      expect(result).toEqual(100);
    });

    it("asserts that it removes issuedForClaim from available count", async () => {
      await createRedisEntry({
        ...defaultValues,
        issuedForClaim:2
      });

      const {platform, sku} = defaultValues;
      const result = await instance.available(platform, sku,"claim");
      expect(result).toEqual(18);
    });

    it("asserts that it removes issued from available count if maximumForClaim is null", async () => {
      await createRedisEntry({
        ...defaultValues,
        maximum: 100,
        issued: 20,
        maximumForClaim: null,
        issuedForClaim:50
      });

      const {platform, sku} = defaultValues;
      const result = await instance.available(platform, sku,"claim");
      expect(result).toEqual(80);
    });

    it("asserts that it uses overall availability if lower", async () => {
      await createRedisEntry({
        ...defaultValues,
        issued:97
      });

      const {platform, sku} = defaultValues;
      const result = await instance.available(platform, sku,"claim");
      expect(result).toEqual(3);
    });

    it("asserts that if expires is in the future it has no effect", async () => {
      
      await createRedisEntry({
        ...defaultValues,
        expires: new Date(new Date().getTime()+1000)
      });

      const {platform, sku} = defaultValues;
      const result = await instance.available(platform, sku,"claim");
      expect(result).toEqual(20);
    });

    it("asserts that if expires is in the past zero is returned", async () => {
      
      await createRedisEntry({
        ...defaultValues,
        expires: new Date(new Date().getTime()-1000)
      });

      const {platform, sku} = defaultValues;
      const result = await instance.available(platform, sku,"claim");
      expect(result).toEqual(0);
    });
  });   

});

  describe("issue", () => {
  
    describe("purchase", () => {

      it("asserts that error is thrown if sku does not exist", async () => {
          await createRedisEntry();
          const {platform} = defaultValues; 
          await expect(
            instance.issue(platform, "UNKNOWN","purchase")
          ).rejects.toThrow("Stock not found. 'SKN', 'UNKNOWN'");
      });

      it("asserts that it returns issued stock", async () => {
        await createRedisEntry();

        const {platform, sku} = defaultValues;
        const result = await instance.issue(platform, sku,"purchase");

        expect(result).toEqual({
          ...SKU_REPOSITORY_TEST,
          issue: 1,
          issued: 1,
          issuedForPurchase: 1,
          availableForPurchase: 79,
        });
      });
    
  });   

 
  describe("claim", () => {
    it("asserts that error is thrown if sku does not exist", async () => {
      await createRedisEntry();
      const {platform} = defaultValues; 
      await expect(
        instance.issue(platform, "UNKNOWN","purchase")
      ).rejects.toThrow("Stock not found. 'SKN', 'UNKNOWN'");
    });


    it("asserts that it returns issued stock", async () => {
      await createRedisEntry();

      const {platform, sku} = defaultValues;
      const result = await instance.issue(platform, sku, "claim");

      expect(result).toEqual({
        ...SKU_REPOSITORY_TEST,
        issue: 1,
        issued: 1,
        issuedForClaim: 1,
        availableForClaim: 19,
      });
    });
  });     

  });

  describe("get", () => {

    it("asserts that null is returned if not found", async () => {
        await createRedisEntry();
        const {platform} = defaultValues; 
        const result = await instance.get(platform, "UNKNOWN");
        expect(result).toBeNull()
    });


    it("asserts that it returns stock information", async () => {

      await createRedisEntry();

      const {platform, sku} = defaultValues;
      const result = await instance.get(platform, sku);
      
      expect(result).toEqual(SKU_REPOSITORY_TEST);
    });

  });

  describe("getAll", () => {

    it("asserts that it returns an empty array if not found", async () => {
      await createRedisEntry();

      const result = await instance.getAll('UNKNOWN');
      
      expect(result).toEqual([]);

    });

    it("asserts that it returns an empty array if not found", async () => {
      await createRedisEntry();

      await createRedisEntry({
        ...defaultValues,
        sku: 'SKU_REPOSITORY_TEST_002'
      });

      const {platform} = defaultValues;
      const result = await instance.getAll(platform);
      
      expect(result).toEqual([
        {
          allocation: "SEQUENTIAL",
          availableForClaim: 20,
          availableForPurchase: 80,
          expires: null,
          issued: 0,
          issuedForClaim: 0,
          issuedForPurchase: 0,
          maximum: 100,
          maximumForClaim: 20,
          maximumForPurchase: 80,
          platform: "SKN",
          sku: "SKU_REPOSITORY_TEST",
        },
        {
          allocation: "SEQUENTIAL",
          availableForClaim: 20,
          availableForPurchase: 80,
          expires: null,
          issued: 0,
          issuedForClaim: 0,
          issuedForPurchase: 0,
          maximum: 100,
          maximumForClaim: 20,
          maximumForPurchase: 80,
          platform: "SKN",
          sku: "SKU_REPOSITORY_TEST_002",
        },
      ]);

    });

  });

});
