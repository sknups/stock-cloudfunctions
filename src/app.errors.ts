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

export const INVALID_CREATE_OPERATION_ERROR = (operation: string) :ErrorReason => {
  return {
    code: 'STOCK_00200',
    message: `Invalid create operation '${operation}'`,
    statusCode: StatusCodes.BAD_REQUEST,
  };
};

export const SKU_MISSING_FROM_URL_ERROR :ErrorReason =  {
    code: 'STOCK_00300',
    message: `sku must be provided in URL`,
    statusCode: StatusCodes.BAD_REQUEST,
};

export const SKU_STOCK_NOT_INITIALISED = (sku: string) :ErrorReason => {
  return {
    code: 'STOCK_00400',
    message: `Stock for '${sku}' has not been initialised`,
    statusCode: StatusCodes.NOT_FOUND,
  };
};

export const SKU_OUT_OF_STOCK = (sku: string) :ErrorReason => {
  return {
    code: 'STOCK_00500',
    message: `${sku}' is out of stock`,
    statusCode: StatusCodes.FORBIDDEN,
  };
};

export const UNCATEGORIZED_ERROR: ErrorReason = {
  code: 'STOCK_00900',
  message: 'An uncategorized error has occurred',
  statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
};


