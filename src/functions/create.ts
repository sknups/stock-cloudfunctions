import { Request } from '@google-cloud/functions-framework';
import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import logger from '../helpers/logger';
import { AppError, INVALID_CREATE_OPERATION_ERROR } from '../app.errors';
import { parseAndValidateRequestData } from '../helpers/validation';
import { AllConfig } from '../config/all-config';
import { CreateRequestDTO, OPERATION } from '../dto/create-request';
import { AbstractFunction } from './abstract-function';

export class Create extends AbstractFunction {

  public constructor(config :AllConfig){
    super(config)
  }

  public async handler(req: Request, res: Response): Promise<void> {
    if (req.method != 'POST') {
      res.status(StatusCodes.METHOD_NOT_ALLOWED).send(`${req.method} not allowed`);
      return;
    }

    const createReq: CreateRequestDTO = await parseAndValidateRequestData(CreateRequestDTO, req);
    const {maxQty, sku} =  createReq
    logger.debug(`Received request to create stock for '${sku}`);

  
    if (createReq.operation === OPERATION.CREATE) {
      await this.repository.create(sku, maxQty)
    } else if (createReq.operation === OPERATION.RESET) {
      await this.repository.update(sku, maxQty)
    } else {
      throw new AppError(INVALID_CREATE_OPERATION_ERROR(createReq.operation))
    }

    res.sendStatus(StatusCodes.OK);

  }
}
