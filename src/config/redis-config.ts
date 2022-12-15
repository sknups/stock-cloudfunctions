import * as Joi from 'joi';
import { ConfigFragment } from './config-fragment';

export type RedisConfig = {
  redisHost: string,
  redisPort: number,
  redisTls: boolean,
  redisPassword: string
  redisDb: number
}

const CONFIG: ConfigFragment<RedisConfig> = {
  schema: {
    REDIS_HOST: Joi.string().required(),
    REDIS_PORT: Joi.number().default('6379'),
    REDIS_TLS: Joi.bool().default('false'),
    REDIS_DB: Joi.number().default('0'),
    REDIS_PASSWORD: Joi.string(),
  },
  load: (envConfig: NodeJS.Dict<string>): RedisConfig => {
    return {
      redisHost: envConfig.REDIS_HOST,
      redisTls: `${envConfig.REDIS_TLS}` === 'true',
      redisPort: Number.parseInt(envConfig.REDIS_PORT),
      redisPassword: envConfig.REDIS_PASSWORD,
      redisDb: Number.parseInt(envConfig.REDIS_DB),
    };
  },
};


export default CONFIG;