import { Request } from '@google-cloud/functions-framework';
import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AllConfig } from 'config/all-config';
import logger from '../helpers/logger';
import { AbstractFunction } from './abstract-function';
import { AppError, STOCK_NOT_FOUND } from '../app.errors';
import { getPlatformAndSkuFromPath, isRetailerRequest } from '../helpers/url';
import { RetailerStockMapper } from '../mapper/retailer/stock-mapper-retailer';
import { InternalStockMapper } from '../mapper/internal/stock-mapper-internal';

export class Get extends AbstractFunction {

  public constructor(config :AllConfig){
    super(config)
  }

  public async handler (req: Request, res: Response): Promise<void> {
    if (req.method != 'GET') {
      res.status(StatusCodes.METHOD_NOT_ALLOWED).send(`${req.method} not allowed`);
      return;
    }

    const {platform, sku} = getPlatformAndSkuFromPath(req);

    logger.debug(`'${platform}' '${sku}'`);
  
    const entity = await this.repository.get(platform, sku);

    if (entity == null) {
      throw new AppError(STOCK_NOT_FOUND(platform, sku))
    }

    const mapper =  isRetailerRequest(req) ? new RetailerStockMapper() : new InternalStockMapper();
    
    res.status(StatusCodes.OK).json(mapper.toDto(entity));
  }
}
