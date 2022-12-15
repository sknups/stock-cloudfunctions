import { Request } from '@google-cloud/functions-framework';
import { Response } from 'express';
import { StockRepository } from '../persistence/stock-repository';
import { AllConfig } from '../config/all-config';

export abstract class AbstractFunction {

  protected repository : StockRepository;
  protected config : AllConfig;

  public constructor(config :AllConfig){
    this.config = config;
    this.repository = new StockRepository(this.config);
  }

  abstract handler(req: Request, res: Response): Promise<void>
}
