import * as MockExpressResponse from "mock-express-response";
import * as functions from '@google-cloud/functions-framework';
import { HttpFunction } from '@google-cloud/functions-framework';
import { getFunction } from '@google-cloud/functions-framework/testing';
import { getMockReq } from "@jest-mock/express";
import { StatusCodes } from "http-status-codes";
import { Update } from "../../src/functions/update";
import { AllConfig, loadConfig } from "../../src/config/all-config";
import { functionWrapper } from "../../src/helpers/wrapper";
import {testEnv} from '../test-env';
import { StockRepository } from '../../src/persistence/stock-repository';

jest.mock('../../src/persistence/stock-repository');

let res = new MockExpressResponse();

const CONFIG: Promise<AllConfig> = loadConfig(testEnv);

const handler: HttpFunction = async (req, res) => functionWrapper(Update, req, res, CONFIG);
functions.http('stock-update', handler);

describe("function - update", () => {
  beforeEach(function () {
    res = new MockExpressResponse();
  });

  it("invalid method returns 405", async () => {
    const req = getMockReq({ method: "GET" });

    const instance = getFunction('stock-update') as HttpFunction;

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.METHOD_NOT_ALLOWED);
  });

  it("returns 400 if no sku is supplied in path", async () => {
    const req = getMockReq({ method: "PUT" });
    const instance = getFunction('stock-update') as HttpFunction;

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toEqual("{\"code\":\"STOCK_00300\",\"message\":\"sku must be provided in URL\",\"statusCode\":400}");
  });

  it("returns 404 if stock for sku has not be initialized", async () => {
    const sku = 'SKU_0001';
    const req = getMockReq({ method: "PUT", path: `/${sku}` });
    const instance = getFunction('stock-update') as HttpFunction;

    const getSpy = jest.spyOn(StockRepository.prototype, 'get');
    getSpy.mockReturnValueOnce(Promise.resolve(null));

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
    expect(res._getString()).toEqual("{\"code\":\"STOCK_00400\",\"message\":\"Stock for 'SKU_0001' has not been initialised\",\"statusCode\":404}");
  });

  it("returns 403 if sku is out of stock", async () => {
    const sku = 'SKU_0001';
    const req = getMockReq({ method: "PUT", path: `/${sku}` });
    const instance = getFunction('stock-update') as HttpFunction;

    const getSpy = jest.spyOn(StockRepository.prototype, 'get');
    getSpy.mockReturnValueOnce(Promise.resolve(0));

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.FORBIDDEN);
    expect(res._getString()).toEqual("{\"code\":\"STOCK_00500\",\"message\":\"SKU_0001' is out of stock\",\"statusCode\":403}");
  });

  it("returns 403 if sku has negative stock", async () => {
    const sku = 'SKU_0001';
    const req = getMockReq({ method: "PUT", path: `/${sku}` });
    const instance = getFunction('stock-update') as HttpFunction;

    const getSpy = jest.spyOn(StockRepository.prototype, 'get');
    getSpy.mockReturnValueOnce(Promise.resolve(-1));

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.FORBIDDEN);
    expect(res._getString()).toEqual("{\"code\":\"STOCK_00500\",\"message\":\"SKU_0001' is out of stock\",\"statusCode\":403}");
  });

  it("decrements stock if sku is in stock", async () => {
    const sku = 'SKU_0001';
    const req = getMockReq({ method: "PUT", path: `/${sku}` });
    const instance = getFunction('stock-update') as HttpFunction;

    const getSpy = jest.spyOn(StockRepository.prototype, 'get');
    getSpy.mockReturnValueOnce(Promise.resolve(1));

    const decrementSpy = jest.spyOn(StockRepository.prototype, 'decrement');
    decrementSpy.mockReturnValueOnce(Promise.resolve(0));

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.OK);
    expect(res._getString()).toEqual("OK");
  });

  it("resets stock to zero, if stock is negative after decrement", async () => {
    const sku = 'SKU_0001';
    const req = getMockReq({ method: "PUT", path: `/${sku}` });
    const instance = getFunction('stock-update') as HttpFunction;

    const getSpy = jest.spyOn(StockRepository.prototype, 'get');
    getSpy.mockReturnValueOnce(Promise.resolve(1));

    const decrementSpy = jest.spyOn(StockRepository.prototype, 'decrement');
    decrementSpy.mockReturnValueOnce(Promise.resolve(-1));

    const updateSpy = jest.spyOn(StockRepository.prototype, 'update');
  
    await instance(req, res);

    expect(updateSpy).toBeCalledWith(sku,0);

    expect(res.statusCode).toEqual(StatusCodes.FORBIDDEN);
    expect(res._getString()).toEqual("{\"code\":\"STOCK_00500\",\"message\":\"SKU_0001' is out of stock\",\"statusCode\":403}");
  });

});
