import { Request } from "@google-cloud/functions-framework";
import { AppError, INVALID_URL_PATH_ERROR } from "../app.errors";
import { match } from "path-to-regexp";

export function isRetailerRequest(req: Request): boolean {
  const parts = req.path.split("/");
  return parts.includes("retailer");
}

export type PlatformParameters = {
  platform: string, 
}

export type PlatformAndSkuParameters =  PlatformParameters & {
  sku: string
}

export function getPlatformFromPath(req: Request): PlatformParameters {
  return getPathParameters<PlatformAndSkuParameters>('(.*)/:platform',req);
}

export function getPlatformAndSkuFromPath(req: Request): PlatformAndSkuParameters {
  return getPathParameters<PlatformAndSkuParameters>('(.*)/:platform/:sku',req);
}

export function getPathParameters<T extends object>(route: string, req: Request): T {
  const matcher = match<T>(route, { decode: decodeURIComponent });
  const result = matcher(req.path);

  if (result === false) {
    throw new AppError(INVALID_URL_PATH_ERROR(route));
  }

  return result.params;
}
