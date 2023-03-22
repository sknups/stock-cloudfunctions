import { Request } from '@google-cloud/functions-framework';
import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AllConfig } from 'config/all-config';
import logger from '../helpers/logger';
import { AbstractFunction } from './abstract-function';
import { AppError, NOT_AVAILABLE_TO_RETAILER, STOCK_NOT_FOUND } from '../app.errors';
import { getPlatformAndSkuFromPath, isRetailerRequest } from '../helpers/url';

export class Delete extends AbstractFunction {

  public constructor(config :AllConfig){
    super(config)
  }

  public async handler (req: Request, res: Response): Promise<void> {
    if (req.method != 'DELETE') {
      res.status(StatusCodes.METHOD_NOT_ALLOWED).send(`${req.method} not allowed`);
      return;
    }

    if (isRetailerRequest(req)) {
      throw new AppError(NOT_AVAILABLE_TO_RETAILER);
    }

    const {platform, sku} = getPlatformAndSkuFromPath(req);

    logger.debug(`'${platform}' '${sku}'`);

    const exist = await this.repository.exists(platform, sku);

    if (!exist) {
      throw new AppError(STOCK_NOT_FOUND(platform, sku))
    }
  
    await this.repository.delete(platform, sku);
    res.sendStatus(StatusCodes.OK);
  }
}
