import { Request } from '@google-cloud/functions-framework';
import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AllConfig } from 'config/all-config';
import logger from '../helpers/logger';
import { AbstractFunction } from './abstract-function';

export class DeleteAll extends AbstractFunction {

  public constructor(config :AllConfig){
    super(config)
  }

  public async handler (req: Request, res: Response): Promise<void> {
    if (req.method != 'DELETE') {
      res.status(StatusCodes.METHOD_NOT_ALLOWED).send(`${req.method} not allowed`);
      return;
    }

    logger.debug('Received request to delete all Redis inventory');

    await this.repository.deleteAll();
    res.sendStatus(StatusCodes.OK);

  }
}
