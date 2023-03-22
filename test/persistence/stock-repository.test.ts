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
  reservedForClaim: 0,
  withheld: 0,
  expires: null,
  issued: 0,
} as StockEntity;

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
    entry.maximum,
    "allocation",
    entry.allocation.toString(),
    "reservedForClaim",
    entry.reservedForClaim,
    "withheld",
    entry.withheld,
    "expires",
    entry.expires == null ? "" : entry.expires.getTime(),
    "issued",
    entry.issued
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
    beforeEach(async () => {
      await createRedisEntry();
    });

    describe("update existing record", () => {
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

      it("asserts that reservedForClaim can be changed for existing entry", async () => {
        await instance.save({
          ...defaultValues,
          reservedForClaim: 100,
        });
 
        expect(
          StockRepository.redis.hget(key(), "reservedForClaim")
        ).resolves.toBe(100);
      });

      it("asserts that withheld can be changed for existing entry", async () => {
        await instance.save({
          ...defaultValues,
          withheld: 23,
        });

        expect(StockRepository.redis.hget(key(), "withheld")).resolves.toBe(23);
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
          defaultValues.allocation
        );
        expect(
          await StockRepository.redis.hget(key(), "reservedForClaim")
        ).toEqual(defaultValues.reservedForClaim);
        expect(await StockRepository.redis.hget(key(), "withheld")).toEqual(
          defaultValues.withheld
        );
        expect(await StockRepository.redis.hget(key(), "expires")).toEqual(
          defaultValues.expires
        );
        expect(await StockRepository.redis.hget(key(), "issued")).toEqual(
          `${defaultValues.issued}`
        );
      });

      it("returns available stock", async () => {
        const result = await instance.save(defaultValues);

        expect(result).toEqual({
          allocation: "SEQUENTIAL",
          available: 100,
          expires: null,
          issued: 0,
          maximum: 100,
          platform: "SKN",
          reservedForClaim: 0,
          sku: "SKU_REPOSITORY_TEST",
          withheld: 0,
        });
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

      it("asserts that reservedForClaim can be changed for existing entry", async () => {
        await instance.set({
          ...defaultValues,
          reservedForClaim: 100,
        });

        expect(
          StockRepository.redis.hget(key(), "reservedForClaim")
        ).resolves.toBe("100");
      });

      it("asserts that withheld can be changed for existing entry", async () => {
        await instance.set({
          ...defaultValues,
          withheld: 23,
        });

        expect(StockRepository.redis.hget(key(), "withheld")).resolves.toBe("23");
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
          issued: 13 ,
        });

        expect(StockRepository.redis.hget(key(), "issued")).resolves.toBe(
          "13"
        );
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
          await StockRepository.redis.hget(key(), "reservedForClaim")
        ).toEqual(`${defaultValues.reservedForClaim}`);
        expect(await StockRepository.redis.hget(key(), "withheld")).toEqual(
          `${defaultValues.withheld}`
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

        expect(result).toEqual({
          allocation: "SEQUENTIAL",
          available: 100,
          expires: null,
          issued: 0,
          maximum: 100,
          platform: "SKN",
          reservedForClaim: 0,
          sku: "SKU_REPOSITORY_TEST",
          withheld: 0,
        });
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
      await instance.delete(platform, sku);
      expect(StockRepository.redis.hexists(key(),"maximum")).resolves.toBeFalsy;
      expect(StockRepository.redis.hexists(key(),"allocation")).resolves.toBeFalsy;
      expect(StockRepository.redis.hexists(key(),"reservedForClaim")).resolves.toBeFalsy;
      expect(StockRepository.redis.hexists(key(),"withheld")).resolves.toBeFalsy;
      expect(StockRepository.redis.hexists(key(),"expires")).resolves.toBeFalsy;
      expect(StockRepository.redis.hexists(key(),"issued")).resolves.toBeFalsy;
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
        expect(result).toEqual(100);
      });

      it("asserts that it removes withheld from available count", async () => {
        await createRedisEntry({
          ...defaultValues,
          withheld:23
        });

        const {platform, sku} = defaultValues;
        const result = await instance.available(platform, sku,"purchase");
        expect(result).toEqual(77);
      });

      it("asserts that it removes reservedForClaim from available count", async () => {
        await createRedisEntry({
          ...defaultValues,
          reservedForClaim:32
        });

        const {platform, sku} = defaultValues;
        const result = await instance.available(platform, sku,"purchase");
        expect(result).toEqual(68);
      });

      it("asserts that it removes issued from available count", async () => {
        await createRedisEntry({
          ...defaultValues,
          issued:50
        });

        const {platform, sku} = defaultValues;
        const result = await instance.available(platform, sku,"purchase");
        expect(result).toEqual(50);
      });


      it("asserts that if expires is in the future it has no effect", async () => {
        
        await createRedisEntry({
          ...defaultValues,
          expires: new Date(new Date().getTime()+1000)
        });

        const {platform, sku} = defaultValues;
        const result = await instance.available(platform, sku,"purchase");
        expect(result).toEqual(100);
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
      expect(result).toEqual(100);
    });

    it("asserts that it removes withheld from available count", async () => {
      await createRedisEntry({
        ...defaultValues,
        withheld:23
      });

      const {platform, sku} = defaultValues;
      const result = await instance.available(platform, sku,"claim");
      expect(result).toEqual(77);
    });

    it("asserts that it does not remove reservedForClaim from available count", async () => {
      await createRedisEntry({
        ...defaultValues,
        reservedForClaim:32
      });

      const {platform, sku} = defaultValues;
      const result = await instance.available(platform, sku,"claim");
      expect(result).toEqual(100);
    });

    it("asserts that it removes issued from available count", async () => {
      await createRedisEntry({
        ...defaultValues,
        issued:50
      });

      const {platform, sku} = defaultValues;
      const result = await instance.available(platform, sku,"claim");
      expect(result).toEqual(50);
    });


    it("asserts that if expires is in the future it has no effect", async () => {
      
      await createRedisEntry({
        ...defaultValues,
        expires: new Date(new Date().getTime()+1000)
      });

      const {platform, sku} = defaultValues;
      const result = await instance.available(platform, sku,"claim");
      expect(result).toEqual(100);
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
           allocation: "SEQUENTIAL",
           available: 99,
           expires: null,
           issue: 1,
           issued: 1,
           maximum: 100,
           platform: "SKN",
           reservedForClaim: 0,
           sku: "SKU_REPOSITORY_TEST",
           withheld: 0,
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

    it("asserts that we can still claim if only reserved available", async () => {
      await createRedisEntry({
        ...defaultValues,
        reservedForClaim: 1,
        withheld: defaultValues.maximum -1
      });

      const {platform, sku} = defaultValues;
      const result = await instance.issue(platform, sku, "claim");

      expect(result).toEqual({
        allocation: "SEQUENTIAL",
        available: 0,
        expires: null,
        issue: 1,
        issued: 1,
        maximum: 100,
        platform: "SKN",
        reservedForClaim: 0,
        sku: "SKU_REPOSITORY_TEST",
        withheld: 99,
      });
    });

    it("asserts that it returns issued stock", async () => {
      await createRedisEntry();

      const {platform, sku} = defaultValues;
      const result = await instance.issue(platform, sku, "claim");

      expect(result).toEqual({
        allocation: "SEQUENTIAL",
        available: 99,
        expires: null,
        issue: 1,
        issued: 1,
        maximum: 100,
        platform: "SKN",
        reservedForClaim: 0,
        sku: "SKU_REPOSITORY_TEST",
        withheld: 0,
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
      
      expect(result).toEqual({
        allocation: "SEQUENTIAL",
        available: 100,
        expires: null,
        issued: 0,
        maximum: 100,
        platform: "SKN",
        reservedForClaim: 0,
        sku: "SKU_REPOSITORY_TEST",
        withheld: 0,
      });
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
      
      expect(result).toEqual(
        [
          {
            allocation: "SEQUENTIAL",
            available: 100,
            expires: null,
            issued: 0,
            maximum: 100,
            platform: "SKN",
            reservedForClaim: 0,
            sku: "SKU_REPOSITORY_TEST",
            withheld: 0,
          },
          {
            allocation: "SEQUENTIAL",
            available: 100,
            expires: null,
            issued: 0,
            maximum: 100,
            platform: "SKN",
            reservedForClaim: 0,
            sku: "SKU_REPOSITORY_TEST_002",
            withheld: 0,
          },
        ]
      );

    });

  });

});
