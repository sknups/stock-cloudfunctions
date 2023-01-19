import { Request } from '@google-cloud/functions-framework';
import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AllConfig } from 'config/all-config';
import logger from '../helpers/logger';
import { AbstractFunction } from './abstract-function';
import { getSkuFromRequestPath } from './url-params';
import { AppError, SKU_OUT_OF_STOCK, SKU_STOCK_NOT_INITIALISED } from '../app.errors';

export class Update extends AbstractFunction {

  public constructor(config :AllConfig){
    super(config)
  }

  public async handler (req: Request, res: Response): Promise<void> {
    if (req.method != 'PUT') {
      res.status(StatusCodes.METHOD_NOT_ALLOWED).send(`${req.method} not allowed`);
      return;
    }

    const sku = getSkuFromRequestPath(req);

    logger.debug(`Received request to decrement stock for '${sku}'`);

    let count = await this.repository.get(sku);

    if (count == null) {
      throw new AppError(SKU_STOCK_NOT_INITIALISED(sku))
    }

    if (count <= 0) {
      throw new AppError(SKU_OUT_OF_STOCK(sku))
    }

    count = await this.repository.decrement(sku);

    if (count < 0) {
      await this.repository.update(sku,0);
      throw new AppError(SKU_OUT_OF_STOCK(sku))
    }

    res.sendStatus(StatusCodes.OK);
  }
}
