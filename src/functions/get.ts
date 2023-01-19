import { Request } from '@google-cloud/functions-framework';
import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AllConfig } from 'config/all-config';
import logger from '../helpers/logger';
import { GetResponseDTO } from '../dto/response';
import { AbstractFunction } from './abstract-function';
import { getSkuFromRequestPath } from './url-params';
import { AppError, SKU_STOCK_NOT_INITIALISED } from '../app.errors';

export class Get extends AbstractFunction {

  public constructor(config :AllConfig){
    super(config)
  }

  public async handler (req: Request, res: Response): Promise<void> {
    if (req.method != 'GET') {
      res.status(StatusCodes.METHOD_NOT_ALLOWED).send(`${req.method} not allowed`);
      return;
    }

    const sku = getSkuFromRequestPath(req);

    logger.debug(`Received request for inventory of '${sku}'`);

    const count = await this.repository.get(sku);

    if (count == null) {
      throw new AppError(SKU_STOCK_NOT_INITIALISED(sku))
    }
    
    res.status(StatusCodes.OK).json(new GetResponseDTO(sku,count));
  }
}
