import { Request } from '@google-cloud/functions-framework';
import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import logger from '../helpers/logger';
import { AppError, NOT_AVAILABLE_TO_RETAILER } from '../app.errors';
import { parseAndValidateRequestData } from '../helpers/validation';
import { AllConfig } from '../config/all-config';
import { Allocation, SaveRequestDTO } from '../dto/internal/save-stock-request';
import { AbstractFunction } from './abstract-function';
import { getPlatformAndSkuFromPath, isRetailerRequest } from '../helpers/url';
import { InternalStockMapper } from '../mapper/internal/stock-mapper-internal';

export class Save extends AbstractFunction {

  public constructor(config :AllConfig){
    super(config)
  }

  public async handler(req: Request, res: Response): Promise<void> {

    if (isRetailerRequest(req)) {
      throw new AppError(NOT_AVAILABLE_TO_RETAILER);
    }

    if (req.method != 'PUT') {
      res.status(StatusCodes.METHOD_NOT_ALLOWED).send(`${req.method} not allowed`);
      return;
    }

    const {platform, sku} = getPlatformAndSkuFromPath(req);

    const createReq: SaveRequestDTO = await parseAndValidateRequestData(SaveRequestDTO, req);
   
    const {maximum, reserved, withheld, expires, allocation} =  createReq

    logger.debug(`Received request to save stock for platform: '${platform}', sku: '${sku}'`);

    const changes = {
      platform,
      sku,
      maximum,
      allocation : allocation? allocation: Allocation.SEQUENTIAL,
      reservedForClaim: reserved? reserved : 0,
      withheld: withheld ? withheld : 0,
      expires: expires ? new Date(expires) : null,
    }
    
    const entity = await this.repository.save(changes)
  
    res.status(StatusCodes.OK).json(new InternalStockMapper().toDto(entity));

  }
}
