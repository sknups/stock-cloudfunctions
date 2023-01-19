import {testEnv} from '../test-env';

import * as MockExpressResponse from "mock-express-response";
import * as functions from '@google-cloud/functions-framework';
import { HttpFunction } from '@google-cloud/functions-framework';
import { getFunction } from '@google-cloud/functions-framework/testing';
import { getMockReq } from "@jest-mock/express";
import { StatusCodes } from "http-status-codes";
import { Get } from "../../src/functions/get";
import { AllConfig, loadConfig } from "../../src/config/all-config";
import { functionWrapper } from "../../src/helpers/wrapper";
import { StockRepository } from '../../src/persistence/stock-repository';

jest.mock('../../src/persistence/stock-repository');

let res = new MockExpressResponse();

const CONFIG: Promise<AllConfig> = loadConfig(testEnv);

const handler: HttpFunction = async (req, res) => functionWrapper(Get, req, res, CONFIG);
functions.http('stock-get', handler);

describe("function - get", () => {
  beforeEach(function () {
    res = new MockExpressResponse();
  });

  it("invalid method returns 405", async () => {
    const req = getMockReq({ method: "PUT" });

    const instance = getFunction('stock-get') as HttpFunction;

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.METHOD_NOT_ALLOWED);
  });

  it("returns 400 if no sku is supplied in path", async () => {
    const req = getMockReq({ method: "GET" });
    const instance = getFunction('stock-get') as HttpFunction;

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toEqual("{\"code\":\"STOCK_00300\",\"message\":\"sku must be provided in URL\",\"statusCode\":400}");
  });

  it("returns a 404 error if the stock has not been initialized for a sku", async () => {
    const sku = 'SKU_0001';
    const req = getMockReq({ method: "GET", path: `/${sku}` });
    const instance = getFunction('stock-get') as HttpFunction;

    const getSpy = jest.spyOn(StockRepository.prototype, 'get');
    getSpy.mockReturnValueOnce(Promise.resolve(null));

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
    expect(res._getString()).toEqual("{\"code\":\"STOCK_00400\",\"message\":\"Stock for 'SKU_0001' has not been initialised\",\"statusCode\":404}");
  });

  it("returns stock for a sku ", async () => {
    const sku = 'SKU_0001';
    const req = getMockReq({ method: "GET", path: `/${sku}` });
    const instance = getFunction('stock-get') as HttpFunction;

    const getSpy = jest.spyOn(StockRepository.prototype, 'get');
    getSpy.mockReturnValueOnce(Promise.resolve(42));

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.OK);
    expect(res._getString()).toEqual("{\"sku\":\"SKU_0001\",\"stock\":42}");
  });


});
