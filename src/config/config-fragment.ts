import * as Joi from 'joi';

export type ConfigFragment<T> = {

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: Joi.PartialSchemaMap<any>,
  load: (envConfig: NodeJS.Dict<string>) => T,
}
