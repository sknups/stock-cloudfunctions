import * as Joi from 'joi';
import { ConfigFragment } from './config-fragment';

export type BaseConfig = {
  logLevel: string,
}

const CONFIG: ConfigFragment<BaseConfig> = {
  schema: {
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').optional(),
    LOG_FORMAT: Joi.string().valid('json', 'simple').optional(),
  },
  load: (envConfig: NodeJS.Dict<string>): BaseConfig => {
    return {
      logLevel: envConfig.LOG_LEVEL,
    };
  },
};

export default CONFIG;
