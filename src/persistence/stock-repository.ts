import { RedisConfig } from "../config/redis-config";
import {Redis, RedisOptions} from "ioredis";
import { AppError, INVALID_SAVE_PROPERTY_CANT_BE_CHANGED_ERROR, OUT_OF_STOCK, STOCK_NOT_FOUND, INVALID_PROPERTIES_ERROR } from "../app.errors";
import { Allocation, AvailableStock, BaseStockEntity, IssuedStock, StockEntity, UpdateStockEntity } from "./stock-entity";

const MAXIMUM_FIELD = 'maximum'; 
const MAXIMUM_FOR_CLAIM_FIELD ='maximumForClaim'; 
const MAXIMUM_FOR_PURCHASE_FIELD ='maximumForPurchase'; 
const ISSUED_FIELD = 'issued'; 
const ISSUED_FOR_CLAIM_FIELD = 'issuedForClaim'; 
const ISSUED_FOR_PURCHASE_FIELD = 'issuedForPurchase'; 
const EXPIRES_FIELD = 'expires';
const ALLOCATION_FIELD = 'allocation';

const ALL_FIELDS = [
  MAXIMUM_FIELD,
  MAXIMUM_FOR_CLAIM_FIELD,
  MAXIMUM_FOR_PURCHASE_FIELD,
  ISSUED_FIELD,
  ISSUED_FOR_CLAIM_FIELD,
  ISSUED_FOR_PURCHASE_FIELD,
  EXPIRES_FIELD,
  ALLOCATION_FIELD,
]

const LUA_ISSUED_OUT_OF_STOCK_ERROR = 'out of stock';
const LUA_STOCK_NOT_FOUND_ERROR = 'stock no found';
const LUA_MAXIMUM_TO_LARGE_ERROR = 'maximum too large';
const LUA_CLAIM_MAXIMUM_LESS_THAN_ISSUED_ERROR = 'claim maximum larger than current issued for claim';
const LUA_PURCHASE_MAXIMUM_LESS_THAN_ISSUED_ERROR = 'purchase maximum larger than current issued for purchase'

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
        issued: 0,
        issuedForClaim: 0,
        issuedForPurchase: 0,
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
    const {platform, sku, maximumForClaim, maximumForPurchase, expires } = stock

    this._defineCustomCommands();
    try{ 
      const key = this._sku_key(platform,sku);
      await this._redis().update(
        key, 
        maximumForClaim, 
        maximumForPurchase,
        expires === null ? null : expires.getTime());
    } catch (error){
      let reason: string;
      switch(error?.message) {
        case LUA_STOCK_NOT_FOUND_ERROR:
          throw new AppError(STOCK_NOT_FOUND(platform, sku));
        case LUA_MAXIMUM_TO_LARGE_ERROR:
          reason = `Sum of maximumForClaim (${maximumForClaim}) and maximumForPurchased (${maximumForPurchase}) is greater than maximum`
          throw new AppError(INVALID_PROPERTIES_ERROR(platform, sku, reason ));
        case LUA_CLAIM_MAXIMUM_LESS_THAN_ISSUED_ERROR:
          reason = `maximumForClaim (${maximumForClaim}) is less than issuedForClaim`
          throw new AppError(INVALID_PROPERTIES_ERROR(platform, sku, reason ));
        case LUA_PURCHASE_MAXIMUM_LESS_THAN_ISSUED_ERROR:
          reason = `maximumForPurchase (${maximumForPurchase}) is less than issuedForPurchase`
          throw new AppError(INVALID_PROPERTIES_ERROR(platform, sku, reason ));
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
    const {
      platform, 
      sku, 
      maximum, 
      issued, 
      issuedForClaim, 
      issuedForPurchase, 
      maximumForClaim, 
      maximumForPurchase, 
      expires, 
      allocation
    } = changes



    if ((maximumForClaim ?? 0) + (maximumForPurchase ?? 0) > maximum) {
      const reason = `Sum of maximumForClaim (${maximumForClaim}) and maximumForPurchased (${maximumForPurchase}) is greater than maximum ${maximum}`
      throw new AppError(INVALID_PROPERTIES_ERROR(platform, sku, reason ));
    }

    if (issuedForClaim + issuedForPurchase > issued) {
      const reason = `Sum of issuedForClaim (${issuedForClaim}) and issuedForPurchase (${issuedForPurchase}) is greater than issued (${issued})`
      throw new AppError(INVALID_PROPERTIES_ERROR(platform, sku, reason ));
    }

    if (issued > maximum) {
      const reason = `Issued (${issued}) greater than maximum (${maximum})`
      throw new AppError(INVALID_PROPERTIES_ERROR(platform, sku, reason ));
    }


    await this._redis().hset(this._sku_key(platform,sku), 
      MAXIMUM_FIELD, maximum, 
      MAXIMUM_FOR_CLAIM_FIELD, maximumForClaim === null ? '': maximumForClaim, 
      MAXIMUM_FOR_PURCHASE_FIELD, maximumForPurchase === null ? '': maximumForPurchase, 
      ISSUED_FIELD, issued, 
      ISSUED_FOR_CLAIM_FIELD, issuedForClaim,
      ISSUED_FOR_PURCHASE_FIELD, issuedForPurchase,
      EXPIRES_FIELD, expires === null ? '' : expires.getTime(),
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
      MAXIMUM_FOR_CLAIM_FIELD, 
      MAXIMUM_FOR_PURCHASE_FIELD,
      ISSUED_FIELD, 
      ISSUED_FOR_CLAIM_FIELD,
      ISSUED_FOR_PURCHASE_FIELD,
      EXPIRES_FIELD,
      ALLOCATION_FIELD,
    );

    if (values[0] === null) {
      return null;
    }
    
    const availableForClaim = await this.available(platform, sku, 'claim');
    const availableForPurchase = await this.available(platform, sku, 'purchase');

    if (availableForClaim === null || availableForPurchase == null) {
      return null;
    }

    return {
      sku,
      platform,
      availableForClaim,
      availableForPurchase,
      maximum: Number(values[0]),
      maximumForClaim: values[1] ? Number(values[1]) : null,
      maximumForPurchase: values[2] ? Number(values[2]) : null,
      issued: Number(values[3]),
      issuedForClaim: Number(values[4]),
      issuedForPurchase: Number(values[5]),
      expires: values[6] ? new Date(Number(values[6])): null,
      allocation: Allocation[values[7]]
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
    return `${this.config.redisKeyPrefix}:${platform}`;
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
        -- wrapper for redis.error_reply so code
        -- can run with ioredis-mock
        function error(val)
          if redis.error_reply then
            return redis.error_reply(val)
          end
         return val
        end

        local skuKey = KEYS[1]
        local claim = ARGV[1] == 'claim'
        local now = tonumber(ARGV[2])

        local maximum = tonumber(redis.call('HGET',skuKey,'${MAXIMUM_FIELD}'));

        -- key does not exist
        if maximum == nil then
          return error('${LUA_STOCK_NOT_FOUND_ERROR}');
        end 

        local expires = tonumber(redis.call('HGET',skuKey,'${EXPIRES_FIELD}'));

        -- sku expired, so not available 
        if (expires and expires < now) then
          return 0;
        end

        local issued = tonumber(redis.call('HGET',skuKey,'${ISSUED_FIELD}'));
        local available = maximum - issued

        if (available <= 0) then
          return 0;
        end
 
        if claim then 
          local maximumForClaim = tonumber(redis.call('HGET',skuKey,'${MAXIMUM_FOR_CLAIM_FIELD}'));
          local issuedForClaim = tonumber(redis.call('HGET',skuKey,'${ISSUED_FOR_CLAIM_FIELD}'));

          if maximumForClaim then
            local availableForClaim = maximumForClaim - issuedForClaim;
            if (available < availableForClaim) then
              return available;
            else
              return availableForClaim;
            end
          else
            return available;
          end
        end

        local maximumForPurchase = tonumber(redis.call('HGET',skuKey,'${MAXIMUM_FOR_PURCHASE_FIELD}'));
        local issuedForPurchase = tonumber(redis.call('HGET',skuKey,'${ISSUED_FOR_PURCHASE_FIELD}'));

        if maximumForPurchase then
          local availableForPurchase = maximumForPurchase - issuedForPurchase;
          if (available < availableForPurchase) then
            return available;
          else
            return availableForPurchase;
          end
        end

        return available;
      `, 
    });
    this._redis().defineCommand("issue", {
      readOnly: false,
      numberOfKeys: 1,
      lua: `
        -- wrapper for redis.error_reply so code
        -- can run with ioredis-mock
        function error(val)
          if redis.error_reply then
            return redis.error_reply(val)
          end
         return val
        end
    
        local skuKey = KEYS[1]
        local claim = ARGV[1] == 'claim'
        local now = tonumber(ARGV[2])

        local maximum = tonumber(redis.call('HGET',skuKey,'${MAXIMUM_FIELD}'));

        -- key does not exist
        if maximum == nil then
          return  error('${LUA_STOCK_NOT_FOUND_ERROR}'); 
        end 

        local expires = tonumber(redis.call('HGET',skuKey,'${EXPIRES_FIELD}'));

        if (expires and expires < now) then
          return error('${LUA_ISSUED_OUT_OF_STOCK_ERROR}'); 
        end    

        local issued = tonumber(redis.call('HGET',skuKey,'${ISSUED_FIELD}'));
        local available = maximum - issued;

        if available <= 0 then
          return error('${LUA_ISSUED_OUT_OF_STOCK_ERROR}'); 
        end
   
        if (claim) then
          local maximumForClaim = tonumber(redis.call('HGET',skuKey,'${MAXIMUM_FOR_CLAIM_FIELD}'));

          if (maximumForClaim) then
            local issuedForClaim = tonumber(redis.call('HGET',skuKey,'${ISSUED_FOR_CLAIM_FIELD}'));
            local availableForClaim = maximumForClaim - issuedForClaim;

            if availableForClaim <= 0 then
              return error('${LUA_ISSUED_OUT_OF_STOCK_ERROR}'); 
            end
          end
    
          redis.call('HINCRBY',skuKey,'${ISSUED_FOR_CLAIM_FIELD}',1);
          return redis.call('HINCRBY',skuKey,'${ISSUED_FIELD}',1);
        end
       
        local maximumForPurchase = tonumber(redis.call('HGET',skuKey,'${MAXIMUM_FOR_PURCHASE_FIELD}'));
       
        if (maximumForPurchase) then
          local issuedForPurchase = tonumber(redis.call('HGET',skuKey,'${ISSUED_FOR_PURCHASE_FIELD}'));
          local availableForPurchase = maximumForPurchase - issuedForPurchase;

          if availableForPurchase <= 0 then
            return error('${LUA_ISSUED_OUT_OF_STOCK_ERROR}'); 
          end
        end

        redis.call('HINCRBY',skuKey,'${ISSUED_FOR_PURCHASE_FIELD}',1);
        return redis.call('HINCRBY',skuKey,'${ISSUED_FIELD}',1);
      `,
    });
 
    this._redis().defineCommand("update", {
      readOnly: false,
      numberOfKeys: 1,
      lua: `
        -- wrapper for redis.error_reply so code
        -- can run with ioredis-mock
        function error(val)
          if redis.error_reply then
            return redis.error_reply(val)
          end
         return val
        end

        local skuKey = KEYS[1]
        local maximumForClaim = tonumber(ARGV[1])
        local maximumForPurchase = tonumber(ARGV[2])
        local expires = tonumber(ARGV[3])
        
        local maximum = tonumber(redis.call('HGET',skuKey,'${MAXIMUM_FIELD}'))

        if maximum == nil then
          return error('${LUA_STOCK_NOT_FOUND_ERROR}')
        end 

        if ((maximumForClaim or 0) + (maximumForPurchase or 0 ) > maximum) then 
          return error('${LUA_MAXIMUM_TO_LARGE_ERROR}') 
        end

        local issuedForClaim = tonumber(redis.call('HGET',skuKey,'${ISSUED_FOR_CLAIM_FIELD}'))
       
        if (maximumForClaim and (issuedForClaim > maximumForClaim)) then 
          return error('${LUA_CLAIM_MAXIMUM_LESS_THAN_ISSUED_ERROR}') 
        end

        local issuedForPurchase = tonumber(redis.call('HGET',skuKey,'${ISSUED_FOR_PURCHASE_FIELD}'))

        if (maximumForPurchase and (issuedForPurchase > maximumForPurchase)) then 
          return error('${LUA_PURCHASE_MAXIMUM_LESS_THAN_ISSUED_ERROR}') 
        end

        if expires then
          redis.call('HSET',skuKey,'${EXPIRES_FIELD}', expires)
        else
          redis.call('HSET',skuKey,'${EXPIRES_FIELD}','')
        end

        if maximumForClaim then
          redis.call('HSET',skuKey,'${MAXIMUM_FOR_CLAIM_FIELD}', maximumForClaim)
        else
          redis.call('HSET',skuKey,'${MAXIMUM_FOR_CLAIM_FIELD}','')
        end

        if maximumForPurchase then
        redis.call('HSET',skuKey,'${MAXIMUM_FOR_PURCHASE_FIELD}', maximumForPurchase)
        else
          redis.call('HSET',skuKey,'${MAXIMUM_FOR_PURCHASE_FIELD}','')
        end
        `,
    });
  }
}
