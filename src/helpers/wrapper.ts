import { Request } from '@google-cloud/functions-framework';
import { AllConfig } from 'config/all-config';
import { Response } from 'express';
import { AbstractFunction } from 'functions/abstract-function';
import { StatusCodes } from 'http-status-codes';
import { AppError, logAppError, UNCATEGORIZED_ERROR } from '../app.errors';
import { ValidationError } from './validation';


/**
 *
 * @param func
 * @param req
 * @param res
 * @param config
 */
export async function functionWrapper (
  func: new (config :AllConfig) => AbstractFunction,
  req: Request,
  res: Response,
  config: Promise<AllConfig>,
) {
  try {
    const cfg: AllConfig = await config;
    await new func(cfg).handler(req, res);
  } catch (e) {
    if (e instanceof ValidationError) {
      res.status(StatusCodes.BAD_REQUEST).json({
        statusCode: StatusCodes.BAD_REQUEST,
        message: e.errorMessages,
      });
      return
    }
    const appError: AppError = e instanceof AppError ? e : new AppError(UNCATEGORIZED_ERROR, e);
    logAppError(appError);
    res.status(appError.reason.statusCode).json(appError.reason);
  }
}
