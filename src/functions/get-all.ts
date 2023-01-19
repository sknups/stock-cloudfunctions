import { Request } from '@google-cloud/functions-framework';
import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AllConfig } from 'config/all-config';
import { GetAllResponseDTO } from '../dto/response';
import { AbstractFunction } from './abstract-function';

export class GetAll extends AbstractFunction {

  public constructor(config :AllConfig){
    super(config)
  }

  public async handler (req: Request, res: Response): Promise<void> {
    if (req.method != 'GET') {
      res.status(StatusCodes.METHOD_NOT_ALLOWED).send(`${req.method} not allowed`);
      return;
    }

    const inventoryCounts = await this.repository.getAll();
    res.status(StatusCodes.OK).json(new GetAllResponseDTO(inventoryCounts));
  }
}
