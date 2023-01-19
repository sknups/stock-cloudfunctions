import * as MockExpressResponse from "mock-express-response";
import * as functions from '@google-cloud/functions-framework';
import { HttpFunction } from '@google-cloud/functions-framework';
import { getFunction } from '@google-cloud/functions-framework/testing';
import { getMockReq } from "@jest-mock/express";
import { StatusCodes } from "http-status-codes";
import { GetAll } from "../../src/functions/get-all";
import { AllConfig, loadConfig } from "../../src/config/all-config";
import { functionWrapper } from "../../src/helpers/wrapper";
import {testEnv} from '../test-env';
import { StockRepository } from '../../src/persistence/stock-repository';

jest.mock('../../src/persistence/stock-repository');

let res = new MockExpressResponse();

const CONFIG: Promise<AllConfig> = loadConfig(testEnv);

const handler: HttpFunction = async (req, res) => functionWrapper(GetAll, req, res, CONFIG);
functions.http('stock-get-all', handler);

describe("function - get-all", () => {
  beforeEach(function () {
    res = new MockExpressResponse();
  });

  it("invalid method returns 405", async () => {
    const req = getMockReq({ method: "PUT" });

    const instance = getFunction('stock-get-all') as HttpFunction;

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.METHOD_NOT_ALLOWED);
  });


  it("returns stock for all skus", async () => {
    const req = getMockReq({ method: "GET" });
    const instance = getFunction('stock-get-all') as HttpFunction;

    const getAllSpy = jest.spyOn(StockRepository.prototype, 'getAll');

    const response: Map<string, number> = new Map<string, number>([
      ['SKU-0001', 100],
      ['SKU-0003', 0],
      ['SKU-0002', 32],
    ]
    );
    
    getAllSpy.mockReturnValueOnce(Promise.resolve(response));

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.OK);
    expect(res._getString()).toEqual("{\"sku\":{\"SKU-0001\":100,\"SKU-0003\":0,\"SKU-0002\":32}}");
  });


});
