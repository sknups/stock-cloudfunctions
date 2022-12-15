import * as Joi from 'joi';
import { getGoogleProjectId } from '../helpers/google';
import base, { BaseConfig } from './base-config';
import redis, { RedisConfig } from './redis-config';

export type AllConfig = BaseConfig & RedisConfig;

const ALL_FRAGMENTS = [
  base,
  redis,
];

const CONFIG_SCHEMA = Joi.object(ALL_FRAGMENTS.map((f) => f.schema).reduce((a, b) => {
  return { ...a, ...b };
}));

function _loadAllConfig (envConfig: NodeJS.Dict<string>): AllConfig {
  return ALL_FRAGMENTS.map((f) => {
    return f.load(envConfig);
  }).reduce((a, b) => {
    return { ...a, ...b };
  }) as AllConfig;
}

/**
 *
 */
export async function loadConfig (env): Promise<AllConfig> {
  const result = CONFIG_SCHEMA.validate(env, { allowUnknown: true });
  if (result.error) {
    throw new Error(`Config validation failed: ${result.error.message}`);
  }
  process.env = result.value;

  if (!process.env.GCLOUD_PROJECT) {
    process.env.GCLOUD_PROJECT = await getGoogleProjectId();
  }

  return _loadAllConfig(process.env);
}
