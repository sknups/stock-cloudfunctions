import { StatusCodes } from 'http-status-codes';
import logger from './helpers/logger';

export type ErrorReason = {
  code: string;
  message: string;
  statusCode: number;
}

export class AppError extends Error {

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor (readonly reason: ErrorReason, cause?: any) {
    super(reason.message);
    const originalStackTrace = cause?.stack;
    if (originalStackTrace) {
      this.stack = `${this.stack}\nCaused by: ${originalStackTrace}`;
    }
  }
}

/**
 *
 * @param error
 */
export function logAppError (error: AppError) {
  const logError: boolean = (logger.level == 'info' || logger.level == 'debug') ||
    (error.reason.statusCode >= 500 && error.reason.statusCode < 600);
  if (logError) {
    logger.error(error);
  }
}

export const REDIS_CONNECTION_ERROR: ErrorReason = {
  code: 'STOCK_0100',
  message: 'Can\'t connect to Redis',
  statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
};

export const ALLOCATION_GREATER_THAN_MAXIMUM_ERROR = (platform: string, sku: string, withheld: number, reserved: number) :ErrorReason => {
  return {
    code: 'STOCK_00201',
    message: `sum of withheld (${withheld}), reserved for claim (${reserved}) and issued greater than maximum . platform: ${platform}, sku ${sku}`,
    statusCode: StatusCodes.BAD_REQUEST,
  };
};

export const INVALID_SAVE_PROPERTY_CANT_BE_CHANGED_ERROR = (platform: string, sku: string, property: string) :ErrorReason => {
  return {
    code: 'STOCK_00202',
    message: `Invalid save of property '${property}' can't be changed. ${platform}, ${sku}`,
    statusCode: StatusCodes.BAD_REQUEST,
  };
};

export const INVALID_URL_PATH_ERROR =  (route: string) :ErrorReason =>  {
  return {
    code: 'STOCK_00300',
    message: `Invalid request path, does not match ${route}`,
    statusCode: StatusCodes.BAD_REQUEST,
  }
};

export const NOT_AVAILABLE_TO_RETAILER: ErrorReason = {
  code: 'STOCK_00301',
  message: 'Not available to retailer',
  statusCode: StatusCodes.FORBIDDEN,
}

export const STOCK_NOT_FOUND = (platform: string, sku: string) :ErrorReason => {
  return {
    code: 'STOCK_00400',
    message: `Stock not found. '${platform}', '${sku}'`,
    statusCode: StatusCodes.NOT_FOUND,
  };
};

export const OUT_OF_STOCK = (platform: string, sku: string) :ErrorReason => {
  return {
    code: 'STOCK_00500',
    message: `Out of stock. '${platform}', '${sku}'`,
    statusCode: StatusCodes.FORBIDDEN,
  };
};

export const UNCATEGORIZED_ERROR: ErrorReason = {
  code: 'STOCK_00900',
  message: 'An uncategorized error has occurred',
  statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
};


