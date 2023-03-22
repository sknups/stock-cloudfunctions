import { Request } from "@google-cloud/functions-framework";
import { Response } from "express";
import { AllConfig } from "../config/all-config";
import { CreateIssue, CreateIssueParameters } from "./create-issue";
import { getPathParameters } from "../helpers/url";
import { StatusCodes } from "http-status-codes";

/**
 * TODO delete when callers migrated to CreateIssue
 *
 * @deprecated - replaced by CreateIssue
 */
export class Update extends CreateIssue {
  
  public constructor(config :AllConfig){
    super(config)
  }

  public async handler(req: Request, res: Response): Promise<void> {
    const params: CreateIssueParameters = {
      ...getPathParameters<{ sku: string }>("(.*)/:sku", req),
      platform: 'SKN',
      type: 'purchase'
    };

    if (req.method != 'PUT') {
      res.status(StatusCodes.METHOD_NOT_ALLOWED).send(`${req.method} not allowed`);
      return;
    }
    
    await this.perform(params, req, res);
  }
}
