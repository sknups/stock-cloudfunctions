import { Request } from '@google-cloud/functions-framework';
import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AllConfig } from '../config/all-config';
import logger from '../helpers/logger';
import { AbstractFunction } from './abstract-function';
import { AppError, NOT_AVAILABLE_TO_RETAILER, STOCK_NOT_FOUND } from '../app.errors';
import { isRetailerRequest, getPathParameters, PlatformAndSkuParameters } from '../helpers/url';
import { InternalIssueCreatedStockMapper } from '../mapper/internal/issue-created-internal';

export type CreateIssueParameters = PlatformAndSkuParameters & {
  type: 'claim' | 'purchase',
}

export class CreateIssue extends AbstractFunction {

  public constructor(config :AllConfig){
    super(config)
  }

  public async handler(req: Request, res: Response): Promise<void> {
    const params = getPathParameters<CreateIssueParameters>('(.*)/:platform/:sku/:type(claim|purchase)',req);
  
    if (req.method != 'POST') {
      res.status(StatusCodes.METHOD_NOT_ALLOWED).send(`${req.method} not allowed`);
      return;
    }

    if (isRetailerRequest(req)) {
      throw new AppError(NOT_AVAILABLE_TO_RETAILER);
    }

    const {platform, sku, type} = params;

    logger.debug(`platform: '${platform}', sku: '${sku}' and type: '${type}'`);

    const exists = await this.repository.exists(platform, sku);

    if (!exists) {
      throw new AppError(STOCK_NOT_FOUND(platform,sku))
    }

    const result = await this.repository.issue(platform,sku,type);

    res.status(StatusCodes.OK).json(new InternalIssueCreatedStockMapper().toDto(result));
  }
}
