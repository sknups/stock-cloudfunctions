import { RedisConfig } from "../config/redis-config";
import { Redis, RedisOptions } from "ioredis";

export class StockRepository {
  public static redis: Redis = null;
  private config: RedisConfig;

  public constructor(config: RedisConfig) {
    this.config = config;
  }

  public async deleteAll(): Promise<void> {
    const keys = await this._scanAll();
    if (keys.length === 0) {
      return
    }
    await this._redis().del(keys);
  }

  public async create(sku: string, count: number): Promise<void> {
    await this._redis().setnx(this._key(sku), `${count}`);
  }

  public async update(sku: string, count: number): Promise<void> {
    await this._redis().set(this._key(sku), `${count}`);
  }

  public async decrement(sku: string): Promise<number> {
    return await this._redis().decr(this._key(sku));
  }

  public async get(sku: string): Promise<number | null> {
    const count = await this._redis().get(this._key(sku));
    if (count === null || count === "") {
      return null;
    }
    return parseInt(count);
  }

  public async getAll(): Promise<Map<string, number>> {
    const keys = await this._scanAll();
    const inventory = new Map<string, number>();

    for (const key of keys) {
      const sku = key.replace("sku_availability:", "");
      const count = await this.get(sku);
      if (count != null) {
        inventory.set(sku,count);
      }
    }
    return inventory;
  }

  private async _scanAll(): Promise<string[]> {
    return new Promise<string[]>((resolve) => {
      let keys = [] as string[];
      const stream = this._redis().scanStream({
        match: "sku_availability:*",
        count: 1000,
      });

      stream.on("data", (resultKeys) => {
        keys = keys.concat(resultKeys);
      });

      stream.on("end", () => {
        resolve(keys);
      });
    });
  }

  private _key(sku: string): string {
    return `sku_availability:${sku}`;
  }

  private _redis(): Redis {
    if (StockRepository.redis != null) {
      return StockRepository.redis;
    }
    const options: RedisOptions = {
      port: this.config.redisPort,
      host: this.config.redisHost,
    };

    if (this.config.redisTls) {
      options.tls = {
        rejectUnauthorized: false
      };
    }

    const password = this.config.redisPassword;

    if (password && password.length > 0) {
      options.password = password;
    }

    StockRepository.redis = new Redis(options);

    return StockRepository.redis;
  }
}
