import { Callback } from "ioredis";

declare module "ioredis" {
  interface RedisCommander<Context> {
    available(
      key: string,
      type: 'claim' | 'purchase',
      now: number,
      callback?: Callback<string>
    ): Result<string, Context>;

    issue(
      key: string,
      type: 'claim' | 'purchase',
      now: number,
      callback?: Callback<string>
    ): Result<string, Context>;

    update(
      key: string,
      reservedForClaim: number,
      withheld: number,
      expiry:  number | null,
      callback?: Callback<string>
    ): Result<string, Context>;
  }
}