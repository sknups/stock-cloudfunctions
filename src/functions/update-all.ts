import { Request } from '@google-cloud/functions-framework';
import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AllConfig } from 'config/all-config';
import logger from '../helpers/logger';
import { AbstractFunction } from './abstract-function';
import { AppError, NOT_AVAILABLE_TO_RETAILER, STOCK_NOT_FOUND } from '../app.errors';
import { getPlatformAndSkuFromPath, isRetailerRequest } from '../helpers/url';
import { InternalStockMapper } from '../mapper/internal/stock-mapper-internal';
import { UpdateAllRequestDTO } from '../dto/internal/update-all-request';
import { parseAndValidateRequestData } from '../helpers/validation';
import { Allocation } from '../persistence/stock-entity';

export class UpdateAll extends AbstractFunction {

  public constructor(config :AllConfig){
    super(config)
  }

  public async handler (req: Request, res: Response): Promise<void> {
    if (req.method != 'PUT') {
      res.status(StatusCodes.METHOD_NOT_ALLOWED).send(`${req.method} not allowed`);
      return;
    }

    if (isRetailerRequest(req)) {
      throw new AppError(NOT_AVAILABLE_TO_RETAILER);
    }

    const {platform, sku} = getPlatformAndSkuFromPath(req);

    logger.debug(`Received request to set all stock data for '${platform}' '${sku}'`);

    const {
      maximum, 
      allocation, 
      maximumForClaim, 
      maximumForPurchase, 
      expires, 
      issued,
      issuedForClaim,
      issuedForPurchase
    } = await parseAndValidateRequestData(UpdateAllRequestDTO, req);
   

    const updateEntity = {
      platform,
      sku,
      maximum,
      allocation : allocation ? allocation: Allocation.SEQUENTIAL,
      maximumForClaim: maximumForClaim ?? null,
      maximumForPurchase: maximumForPurchase ?? null,
      expires: expires ? new Date(expires) : null,
      issued: issued,
      issuedForClaim: issuedForClaim,
      issuedForPurchase: issuedForPurchase
    }
  
    const entity = await this.repository.set(updateEntity);
  
    if (entity == null) {
      throw new AppError(STOCK_NOT_FOUND(platform, sku))
    }

    res.status(StatusCodes.OK).json(new InternalStockMapper().toDto(entity));
  }
}
