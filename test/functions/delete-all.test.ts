import * as MockExpressResponse from "mock-express-response";
import * as functions from '@google-cloud/functions-framework';
import { HttpFunction } from '@google-cloud/functions-framework';
import { getFunction } from '@google-cloud/functions-framework/testing';
import { getMockReq } from "@jest-mock/express";
import { StatusCodes } from "http-status-codes";
import { DeleteAll } from "../../src/functions/delete-all";
import { AllConfig, loadConfig } from "../../src/config/all-config";
import { functionWrapper } from "../../src/helpers/wrapper";
import {testEnv} from '../test-env';
import { StockRepository } from '../../src/persistence/stock-repository';

jest.mock('../../src/persistence/stock-repository');

let res = new MockExpressResponse();

const CONFIG: Promise<AllConfig> = loadConfig(testEnv);

const handler: HttpFunction = async (req, res) => functionWrapper(DeleteAll, req, res, CONFIG);
functions.http('stock-delete-all', handler);

describe("function - delete-all", () => {
  beforeEach(function () {
    res = new MockExpressResponse();
  });

  it("invalid method returns 405", async () => {
    const req = getMockReq({ method: "PUT" });

    const instance = getFunction('stock-delete-all') as HttpFunction;

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.METHOD_NOT_ALLOWED);
  });

  it("calls repository delete", async () => {
    const req = getMockReq({ method: "DELETE" });

    const instance = getFunction('stock-delete-all') as HttpFunction;

    const deleteSpy = jest.spyOn(StockRepository.prototype, 'deleteAll');

    await instance(req, res);

    expect(deleteSpy).toBeCalled()

    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

});
