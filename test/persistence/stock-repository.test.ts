import { AllConfig, loadConfig } from "../../src/config/all-config";
import { testEnv } from "../test-env";
import { StockRepository } from "../../src/persistence/stock-repository";
import * as Redis from "ioredis-mock";

jest.mock("ioredis", () => jest.requireActual("ioredis-mock"));

describe("repository - stock", () => {
  StockRepository.redis = new Redis();

  afterEach((done) => {
    StockRepository.redis.flushall().then(() => done());
  });

  describe("get", () => {
    const sku = "SKU_0001";

    it("returns null if stock is not in redis", async () => {
      const CONFIG: AllConfig = await loadConfig(testEnv);
      const instance = new StockRepository(CONFIG);

      expect(await instance.get(sku)).toBe(null);
    });

    it("returns null if stock is blank in redis", async () => {
      const CONFIG: AllConfig = await loadConfig(testEnv);
      const instance = new StockRepository(CONFIG);

      StockRepository.redis.set(`sku_availability:${sku}`, "");

      expect(await instance.get(sku)).toBe(null);
    });

    it("returns stock from redis as number", async () => {
      const CONFIG: AllConfig = await loadConfig(testEnv);
      const instance = new StockRepository(CONFIG);

      StockRepository.redis.set(`sku_availability:${sku}`, "65");

      expect(await instance.get(sku)).toBe(65);
    });
  });

  describe("getAll", () => {

    it("ignores skus with blank stock", async () => {
      const CONFIG: AllConfig = await loadConfig(testEnv);
      const instance = new StockRepository(CONFIG);

      StockRepository.redis.set("sku_availability:SKU_0001", "76");
      StockRepository.redis.set("sku_availability:SKU_0002", "");
      StockRepository.redis.set("sku_availability:SKU_0003", "0");

      expect(await instance.getAll()).toEqual(
        new Map([
          ["SKU_0001", 76],
          ["SKU_0003", 0],
        ])
      );
    });

    it("returns stock from valid skus in redis", async () => {
      const CONFIG: AllConfig = await loadConfig(testEnv);
      const instance = new StockRepository(CONFIG);

      StockRepository.redis.set("sku_availability:SKU_0001", "76");
      StockRepository.redis.set("sku_availability:SKU_0002", "32");
      StockRepository.redis.set("sku_availability:SKU_0003", "0");

      expect(await instance.getAll()).toEqual(
        new Map([
          ["SKU_0001", 76],
          ["SKU_0002", 32],
          ["SKU_0003", 0],
        ])
      );
    });
  });

  describe("create", () => {

    it("creates entry in redis", async () => {
      const CONFIG: AllConfig = await loadConfig(testEnv);
      const instance = new StockRepository(CONFIG);

      expect(await StockRepository.redis.exists("sku_availability:SKU_0001")).toBeFalsy();
   
      await instance.create("SKU_0001", 54)

      expect(await StockRepository.redis.get("sku_availability:SKU_0001")).toEqual("54");
   
    });

    it("does not update value if it already exists", async () => {
      const CONFIG: AllConfig = await loadConfig(testEnv);
      const instance = new StockRepository(CONFIG);

      StockRepository.redis.set("sku_availability:SKU_0001", "443");
      
      await instance.create("SKU_0001", 76)

      expect(await StockRepository.redis.get("sku_availability:SKU_0001")).toEqual("443");

    });
  });

  describe("update", () => {

    it("creates entry in redis", async () => {
      const CONFIG: AllConfig = await loadConfig(testEnv);
      const instance = new StockRepository(CONFIG);

      expect(await StockRepository.redis.exists("sku_availability:SKU_0001")).toBeFalsy();
   
      await instance.update("SKU_0001", 54)

      expect(await StockRepository.redis.get("sku_availability:SKU_0001")).toEqual("54");
   
    });

    it("updates value if it already exists", async () => {
      const CONFIG: AllConfig = await loadConfig(testEnv);
      const instance = new StockRepository(CONFIG);

      StockRepository.redis.set("sku_availability:SKU_0001", "443");
      
      await instance.update("SKU_0001", 76)

      expect(await StockRepository.redis.get("sku_availability:SKU_0001")).toEqual("76");

    });
  });

  describe("decrement", () => {

    it("sets value to -1 if value not set", async () => {
      const CONFIG: AllConfig = await loadConfig(testEnv);
      const instance = new StockRepository(CONFIG);

      expect(await StockRepository.redis.exists("sku_availability:SKU_0001")).toBeFalsy();
   
      await instance.decrement("SKU_0001")

      expect(await StockRepository.redis.get("sku_availability:SKU_0001")).toEqual("-1");
   
    });

    it("decrements stock count by 1", async () => {
      const CONFIG: AllConfig = await loadConfig(testEnv);
      const instance = new StockRepository(CONFIG);

      StockRepository.redis.set("sku_availability:SKU_0001", "10");
      
      await instance.decrement("SKU_0001")

      expect(await StockRepository.redis.get("sku_availability:SKU_0001")).toEqual("9");

    });
  });

  describe("deleteAll", () => {

    it("it deletes all matching keys", async () => {
      const CONFIG: AllConfig = await loadConfig(testEnv);
      const instance = new StockRepository(CONFIG);

      await StockRepository.redis.set("sku_availability:SKU_0001","123");
      await StockRepository.redis.set("sku_availability:SKU_0002","123");
      await StockRepository.redis.set("other:SKU_0003","123");
      await StockRepository.redis.set("sku_availability:SKU_0003","123");
    
   
      await instance.deleteAll();

      expect(await StockRepository.redis.keys("*")).toEqual(["other:SKU_0003"]);   
    });
  });
});
