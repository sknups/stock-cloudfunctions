import { Request } from '@google-cloud/functions-framework';
import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AllConfig } from 'config/all-config';
import { AbstractFunction } from './abstract-function';
import { InternalStockMapper } from '../mapper/internal/stock-mapper-internal';
import { getPlatformFromPath, isRetailerRequest } from '../helpers/url';
import { RetailerStockMapper } from '../mapper/retailer/stock-mapper-retailer';

export class GetAll extends AbstractFunction {

  public constructor(config :AllConfig){
    super(config)
  }

  public async handler (req: Request, res: Response): Promise<void> {
    if (req.method != 'GET') {
      res.status(StatusCodes.METHOD_NOT_ALLOWED).send(`${req.method} not allowed`);
      return;
    }

    const {platform} = getPlatformFromPath(req);
  
    const entities = await this.repository.getAll(platform);
  
    const mapper =  isRetailerRequest(req) ? new RetailerStockMapper() : new InternalStockMapper();
    const stock = entities.map(entity => mapper.toDto(entity))
    res.status(StatusCodes.OK).json(stock);
  }
}
