import { RedisConfig } from "../config/redis-config";
import {Redis, RedisOptions} from "ioredis";
import { AppError, ALLOCATION_GREATER_THAN_MAXIMUM_ERROR, INVALID_SAVE_PROPERTY_CANT_BE_CHANGED_ERROR, OUT_OF_STOCK, STOCK_NOT_FOUND } from "../app.errors";
import { Allocation, AvailableStock, BaseStockEntity, IssuedStock, StockEntity, UpdateStockEntity } from "./stock-entity";

const MAXIMUM_FIELD = 'maximum'; 
const RESERVED_FOR_CLAIM_FIELD ='reservedForClaim'; 
const ISSUED_FIELD = 'issued'; 
const WITHHELD_FIELD = 'withheld';
const EXPIRES_FIELD = 'expires';
const ALLOCATION_FIELD = 'allocation';

const ALL_FIELDS = [
  MAXIMUM_FIELD,
  ISSUED_FIELD,
  RESERVED_FOR_CLAIM_FIELD,
  WITHHELD_FIELD, 
  EXPIRES_FIELD,
  ALLOCATION_FIELD,
]

const LUA_ISSUED_OUT_OF_STOCK_ERROR = 'out of stock';
const LUA_STOCK_NOT_FOUND_ERROR = 'stock no found';
const LUA_UPDATE_GREATER_THAN_MAXIMUM_ERROR = 'allocated too large'

export class StockRepository {
  public static redis: Redis = null;
  private config: RedisConfig;

  public constructor(config: RedisConfig) {
    this.config = config;
  }

  /**
   * Check if stock exists for sku
   * 
   * @param platform The platform that owns the sku
   * @param sku The sku
   * @returns true if stock exists for sku, otherwise false is returned
   */
  public async exists(platform :string, sku :string ): Promise<boolean> {
    const exists = await this._redis().hexists(this._sku_key(platform,sku), MAXIMUM_FIELD)
    return exists === 1
  }

  /**
   * Save Stock information for a SKU. Will perform an upsert. 
   * 
   * If stock does not exist for the SKU and platform combination stock will
   * be initialized and issued set to zero.
   * 
   * If the stock does exist only the following properties will be updated
   *   - reservedForClaim
   *   - withheld 
   *   - expiry
   * 
   * An error will be thrown if performing an update any of the following properties
   * have changed
   *   - maximum
   *   - allocation
   * 
   * @param changes - The change to be saved
   * @returns the new / updated stock entry
   */
  public async save(changes :BaseStockEntity): Promise<AvailableStock> {
    const {platform, sku} =  changes

    const existing = await this.get(platform, sku);


    if (existing === null) {
      return await this.set({
        ...changes,
        issued: 0 
       });
    }

    if (changes.maximum != existing.maximum) {
      throw new AppError(INVALID_SAVE_PROPERTY_CANT_BE_CHANGED_ERROR(platform,sku,'maximum'));
    }

    if (changes.allocation != existing.allocation) {
      throw new AppError(INVALID_SAVE_PROPERTY_CANT_BE_CHANGED_ERROR(platform,sku,'allocation'));
    }
  
    return await this.update(changes);
  }

  private async update(stock :UpdateStockEntity): Promise<AvailableStock> {
    const {platform, sku, reservedForClaim, withheld, expires } = stock
    this._defineCustomCommands();
    try{ 
      const key = this._sku_key(platform,sku);
      await this._redis().update(
        key, 
        reservedForClaim, 
        withheld,
        expires === null ? null : expires.getTime());
    } catch (error){
      switch(error?.message) {
        case LUA_STOCK_NOT_FOUND_ERROR:
          throw new AppError(STOCK_NOT_FOUND(platform, sku));
        case LUA_UPDATE_GREATER_THAN_MAXIMUM_ERROR:
          throw new AppError(ALLOCATION_GREATER_THAN_MAXIMUM_ERROR(platform, sku,withheld,reservedForClaim));
        default:
          throw new Error(`update failed '${error?.message}'`)
      }
    }
    
    const updated = this.get(platform,sku)

    if (updated === null) {
      throw new AppError(STOCK_NOT_FOUND(platform, sku));
    }
    
    return updated;
  }

  /**
   * WARNING: This will override all values including the amount
   * that has already been issued.
   * 
   * For nearly all situations the save method should be used.
   * 
   * @param changes - The change to be saved
   * @returns the new / updated stock entry
   */
  public async set(changes :StockEntity): Promise<AvailableStock> {
    const {platform, sku, maximum, issued, reservedForClaim, withheld, expires, allocation} = changes

    if (issued + reservedForClaim + withheld > maximum) {
      throw new AppError(ALLOCATION_GREATER_THAN_MAXIMUM_ERROR(platform,sku,  withheld, reservedForClaim ));
    }

    await this._redis().hset(this._sku_key(platform,sku), 
      MAXIMUM_FIELD, maximum, 
      ISSUED_FIELD, issued, 
      RESERVED_FOR_CLAIM_FIELD, reservedForClaim, 
      WITHHELD_FIELD, withheld,
      EXPIRES_FIELD, expires === null ? null : expires.getTime(),
      ALLOCATION_FIELD, allocation
    );

    const updated = this.get(platform,sku)

    if (updated === null) {
      throw new AppError(STOCK_NOT_FOUND(platform, sku));
    }
    
    return updated;
  }

  /**
   * Delete stock data for sku, if data does not exist 
   * {@link STOCK_NOT_FOUND} exception is thrown
   * 
   * @param platform The platform that owns the sku
   * @param sku The sku
   */
  public async delete(platform: string, sku: string): Promise<void> {
   

    if (!await this.exists(platform, sku)) {
      throw new AppError(STOCK_NOT_FOUND(platform, sku));
    }
   
    await this._redis().hdel(
      this._sku_key(platform,sku), 
      ...ALL_FIELDS,
    );
  }

  /**
   * Return the available stock for a sku or null if stock
   * does not exist
   * 
   * @param platform The platform that owns the sku
   * @param sku The sku
   * @param type Type to check availability for 'claim' or 'purchase'
   * @returns available stock or null
   */
  public async available(platform :string, sku: string, type: 'claim' | 'purchase'): Promise<number|null> {
   this._defineCustomCommands();

   if (!await this.exists(platform, sku)) {
    return null;
   }

    try{ 
      return await this._redis().available(this._sku_key(platform,sku), type, new Date().getTime());
    } catch (error){
      switch(error?.message) {
        case LUA_STOCK_NOT_FOUND_ERROR:
          return null;
        default:
          throw new Error(`available failed '${error?.message}'`)
      }
    }
   
  }

  /**
   * 
   * @param platform The platform that owns the sku
   * @param sku The sku
   * @param type Type to check availability for 'claim' or 'purchase'
   * @returns available stock after performing thew issue.
   */
  public async issue(platform :string, sku: string, type: 'claim' | 'purchase'): Promise<IssuedStock> {
    this._defineCustomCommands();

    if (!await this.exists(platform, sku)) {
      throw new AppError(STOCK_NOT_FOUND(platform, sku));
    }
    let issued;
    try{ 
      issued = await this._redis().issue(this._sku_key(platform,sku), type, new Date().getTime());
    } catch (error){
      console.debug(error)
      switch(error?.message) {
        case LUA_STOCK_NOT_FOUND_ERROR:
          throw new AppError(STOCK_NOT_FOUND(platform, sku));
        case LUA_ISSUED_OUT_OF_STOCK_ERROR:
          throw new AppError(OUT_OF_STOCK(platform, sku));
        default:
          throw new Error(`issue failed '${error?.message}'`)
      }
    }

    if (issued === null) {
      throw new AppError(STOCK_NOT_FOUND(platform, sku));
    }

    const entity = await this.get(platform,sku)

    if (entity === null) {
      throw new AppError(STOCK_NOT_FOUND(platform, sku));
    }

    return {
      ...entity,
      issue: issued,
      issued
    };
  }

  public async get(platform: string, sku: string): Promise<AvailableStock | null> {
    this._defineCustomCommands();

    const values = await this._redis().hmget(
      this._sku_key(platform,sku), 
      MAXIMUM_FIELD,
      ISSUED_FIELD,
      RESERVED_FOR_CLAIM_FIELD,
      WITHHELD_FIELD, 
      EXPIRES_FIELD,
      ALLOCATION_FIELD,
    );

    if (values[0] === null) {
      return null;
    }
    
    const available = await this.available(platform, sku, 'purchase');

    if (available === null) {
      return null;
    }
    

    return {
      sku,
      platform,
      available,
      maximum: Number(values[0]),
      issued: Number(values[1]),
      reservedForClaim: Number(values[2]),
      withheld: Number(values[3]),
      expires: values[4] ? new Date(Number(values[4])): null,
      allocation: Allocation[values[5]]
    }
  }

  /**
   * Return all stock for a platform
   * 
   * @param platform to retrieve stock for
   * @returns array of stock, could be empty
   */
  public async getAll(platform: string): Promise<AvailableStock[]> {
    const keys = await this._scanAll(platform);
    const entities = [] as AvailableStock[];

    for (const key of keys) {
      const sku = key.replace(`${this._platform_key(platform)}:`, '');
      const stock = await this.get(platform,sku);
      if (stock != null) {
        entities.push(stock);
      }
    }
    return entities;
  }

  private async _scanAll(platform :string): Promise<string[]> {
    return new Promise<string[]>((resolve) => {
      let keys = [] as string[];
      const stream = this._redis().scanStream({
        match: `${this._platform_key(platform)}:*`,
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

  private _sku_key(platform: string, sku: string): string {
    return `${this._platform_key(platform)}:${sku}`;
  }

  private _platform_key(platform: string): string {
    return `stock:${platform}`;
  }

  private _redis(): Redis {
    if (StockRepository.redis != null) {
      return StockRepository.redis;
    }
    const options: RedisOptions = {
      port: this.config.redisPort,
      host: this.config.redisHost,
      showFriendlyErrorStack: true
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

  /**
   * Define custom Redis commands used to calculate 
   * available stock and allocate stock
   * 
   * This method needs to be run before executing the custom
   * commands to ensure they are available. 
   */
  private async _defineCustomCommands(): Promise<void> {
    this._redis().defineCommand("available", {
      readOnly: true,
      numberOfKeys: 1,
      lua: `
        local skuKey = KEYS[1]
        local claim = ARGV[1] == 'claim'
        local now = tonumber(ARGV[2])

        local maximum = tonumber(redis.call('HGET',skuKey,'${MAXIMUM_FIELD}'));

        -- key does not exist
        if maximum == nil then
          return redis.error_reply('${LUA_STOCK_NOT_FOUND_ERROR}');
        end 

        local expires = tonumber(redis.call('HGET',skuKey,'${EXPIRES_FIELD}'));

        -- sku expired, so not available 
        if (expires and expires < now) then
          return 0;
        end

        local maximum = tonumber(redis.call('HGET',skuKey,'${MAXIMUM_FIELD}'));
        local issued = tonumber(redis.call('HGET',skuKey,'${ISSUED_FIELD}'));
        local withheld = tonumber(redis.call('HGET',skuKey,'${WITHHELD_FIELD}'));
        local reservedForClaim = tonumber(redis.call('HGET',skuKey,'${RESERVED_FOR_CLAIM_FIELD}'));
        local available = maximum - issued - reservedForClaim - withheld;

        if claim then 
          available = maximum - issued - withheld;
        end

        return available;
      `, 
    });
    this._redis().defineCommand("issue", {
      readOnly: false,
      numberOfKeys: 1,
      lua: `
        local skuKey = KEYS[1]
        local claim = ARGV[1] == 'claim'
        local now = tonumber(ARGV[2])

        local maximum = tonumber(redis.call('HGET',skuKey,'${MAXIMUM_FIELD}'));

        -- key does not exist
        if maximum == nil then
          return  redis.error_reply('${LUA_STOCK_NOT_FOUND_ERROR}'); 
        end 

        local expires = tonumber(redis.call('HGET',skuKey,'${EXPIRES_FIELD}'));

        -- sku expired, so not available 
        if (expires and expires < now) then
          return  redis.error_reply('${LUA_ISSUED_OUT_OF_STOCK_ERROR}'); 
        end

        local issued = tonumber(redis.call('HGET',skuKey,'${ISSUED_FIELD}'));
        local withheld = tonumber(redis.call('HGET',skuKey,'${WITHHELD_FIELD}'));
        local reservedForClaim = tonumber(redis.call('HGET',skuKey,'${RESERVED_FOR_CLAIM_FIELD}'));
        local available = maximum - issued - reservedForClaim - withheld;

        if claim then 
          available = maximum - issued - withheld;
        end

        if available <= 0 then
          return redis.error_reply('${LUA_ISSUED_OUT_OF_STOCK_ERROR}'); 
        end

        if claim and reservedForClaim > 0 then
          -- cant use transactions within a Lua script
          redis.call('HINCRBY',skuKey,'${RESERVED_FOR_CLAIM_FIELD}',-1);
          return redis.call('HINCRBY',skuKey,'${ISSUED_FIELD}',1);
        end
        
        return redis.call('HINCRBY',skuKey,'${ISSUED_FIELD}',1);
      `,
    });
 
    this._redis().defineCommand("update", {
      readOnly: false,
      numberOfKeys: 1,
      lua: `
        local skuKey = KEYS[1]
        local reservedForClaim = tonumber(ARGV[1])
        local withheld = tonumber(ARGV[2])
        local expires = tonumber(ARGV[3])
        
        local maximum = tonumber(redis.call('HGET',skuKey,'${MAXIMUM_FIELD}'))

        -- key does not exist
        if maximum == nil then
          return redis.error_reply('${LUA_STOCK_NOT_FOUND_ERROR}')
        end 

        local issued = tonumber(redis.call('HGET',skuKey,'${ISSUED_FIELD}'))
        local allocated = reservedForClaim + issued + withheld
       
       if (allocated > maximum) then 
         return  redis.error_reply('${LUA_UPDATE_GREATER_THAN_MAXIMUM_ERROR}') 
       end

       if expires ~= nil then
         expires = tonumber(expires)
       end
       
       return redis.call('HSET',skuKey,'${EXPIRES_FIELD}', expires, '${RESERVED_FOR_CLAIM_FIELD}',reservedForClaim, '${WITHHELD_FIELD}',withheld)
        
      `,
    });
  }
}
