import {testEnv} from '../test-env';
import { mocks } from "../mocks";
import * as MockExpressResponse from "mock-express-response";
import * as functions from '@google-cloud/functions-framework';
import { HttpFunction } from '@google-cloud/functions-framework';
import { getFunction } from '@google-cloud/functions-framework/testing';
import { getMockReq } from "@jest-mock/express";
import { StatusCodes } from "http-status-codes";
import { Save } from "../../src/functions/save";
import { AllConfig, loadConfig } from "../../src/config/all-config";
import { functionWrapper } from "../../src/helpers/wrapper";
import { Allocation } from '../../src/dto/internal/save-stock-request';
import { AvailableStock, BaseStockEntity } from '../../src/persistence/stock-entity';

const CONFIG: Promise<AllConfig> = loadConfig(testEnv);

const handler: HttpFunction = async (req, res) => functionWrapper(Save, req, res, CONFIG);
functions.http('stock-save', handler);

const platform = 'SKN';
const sku = 'SAVE_SKU';

function _testBody(): any {
  return {
    maximum: 1000,
  };
}

async function _sendRequest(
  bodyOverrides: any = {},
  bodyModifier = (_body: any) => { },
  platform = 'SKN',
  sku = 'SAVE_SKU',
): Promise<MockExpressResponse> {
  const body = { ..._testBody(), ...bodyOverrides };
  bodyModifier(body);
  const req = getMockReq({path:`/${platform}/${sku}`, method: 'PUT', body});
  const res = new MockExpressResponse();
  const instance = getFunction('stock-save') as HttpFunction;
  await instance(req, res);
  return res;
}

describe("function - save", () => {

  beforeEach(function () {
    mocks.repository.save.mockResolvedValue(Promise.resolve({
      platform,
      sku,
      allocation: Allocation.SEQUENTIAL,
      expires: null,
      issued: 0,
      maximum: 1000,
      availableForPurchase: 1000,
      availableForClaim: 0,
    } as AvailableStock));
  })

  afterEach(function () {
    mocks.mockClear();
  });

  it("invalid method returns 405", async () => {
    const req = getMockReq({ 
      path: `/${platform}/${sku}`,
      method: "POST",
      body: {maximum: 1000},
    });
    const res = new MockExpressResponse();

    const instance = getFunction('stock-save') as HttpFunction;
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.METHOD_NOT_ALLOWED);
  });

  it("returns 400 if no platform or sku is supplied in path", async () => {
    const req = getMockReq({ 
      path: `/`,
      method: "PUT",
      body: {maximum: 1000},
    });
    const res = new MockExpressResponse();

    const instance = getFunction('stock-save') as HttpFunction;
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("STOCK_00300");
  });


  it("returns 403 if called by retailer", async () => {
    const req = getMockReq({ 
      path: `/retailer/${platform}/${sku}`,
      method: "PUT",
      body: {maximum: 1000},
    });
    const res = new MockExpressResponse();
    
    const instance = getFunction('stock-save') as HttpFunction;
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.FORBIDDEN);
    expect(res._getString()).toContain("STOCK_00301");
  });

  it("asserts maximum is required", async () => {
    const res =  await _sendRequest({}, body => delete body.maximum);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("maximum should not be empty");
  });

  it("asserts maximum must be a number", async () => {
    const res =  await _sendRequest({maximum:"TEST"});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("maximum must be an integer number");
  });

  it("asserts maximum must be a integer", async () => {
    const res =  await _sendRequest({maximum:1.23});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("maximum must be an integer number");
  });

  it("asserts maximum must be greater than 0", async () => {
    const res =  await _sendRequest({maximum:0});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("maximum must be a positive number");
  });

  it("asserts maximumForClaim must be a number", async () => {
    const res =  await _sendRequest({maximumForClaim:"TEST"});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("maximumForClaim must be an integer number");
  });

  it("asserts maximumForClaim must be a integer", async () => {
    const res =  await _sendRequest({maximumForClaim:1.23});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("maximumForClaim must be an integer number");
  });

  it("asserts maximumForClaim must be positive", async () => {
    const res =  await _sendRequest({maximumForClaim:-1});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("maximumForClaim must not be less than 0");
  });


  it("asserts maximumForClaim is optional", async () => {
    const res =  await _sendRequest({}, body => delete body.maximumForClaim);
    expect(res.statusCode).toEqual(StatusCodes.OK);
  });


  it("asserts maximumForClaim can be zero", async () => {
    const res =  await _sendRequest({maximumForClaim:0});

    expect(mocks.repository.save).toBeCalledWith({
      platform,
      sku,
      allocation: Allocation.SEQUENTIAL,
      expires: null,
      maximum: 1000,
      maximumForClaim: 0,
      maximumForPurchase: null,
    } as BaseStockEntity);

    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("asserts maximumForClaim can be null", async () => {
    const res =  await _sendRequest({maximumForClaim:null});

    expect(mocks.repository.save).toBeCalledWith({
      platform,
      sku,
      allocation: Allocation.SEQUENTIAL,
      expires: null,
      maximum: 1000,
      maximumForClaim: null,
      maximumForPurchase: null,
    } as BaseStockEntity);

    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("asserts maximumForPurchase must be a number", async () => {
    const res =  await _sendRequest({maximumForPurchase:"TEST"});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("maximumForPurchase must be an integer number");
  });

  it("asserts maximumForPurchase must be a integer", async () => {
    const res =  await _sendRequest({maximumForPurchase:1.23});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("maximumForPurchase must be an integer number");
  });

  it("asserts maximumForPurchase must be positive", async () => {
    const res =  await _sendRequest({maximumForPurchase:-1});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("maximumForPurchase must not be less than 0");
  });


  it("asserts maximumForPurchase is optional", async () => {
    const res =  await _sendRequest({}, body => delete body.maximumForPurchase);
    expect(res.statusCode).toEqual(StatusCodes.OK);
  });


  it("asserts maximumForPurchase can be zero", async () => {
    const res =  await _sendRequest({maximumForPurchase:0});

    expect(mocks.repository.save).toBeCalledWith({
      platform,
      sku,
      allocation: Allocation.SEQUENTIAL,
      expires: null,
      maximum: 1000,
      maximumForClaim: null,
      maximumForPurchase: 0,
    } as BaseStockEntity);

    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("asserts maximumForPurchase can be null", async () => {
    const res =  await _sendRequest({maximumForClaim:null});

    expect(mocks.repository.save).toBeCalledWith({
      platform,
      sku,
      allocation: Allocation.SEQUENTIAL,
      expires: null,
      maximum: 1000,
      maximumForClaim: null,
      maximumForPurchase: null,
    } as BaseStockEntity);

    expect(res.statusCode).toEqual(StatusCodes.OK);
  });


  it("asserts expires must be a valid ISO 8601 date", async () => {
    const res =  await _sendRequest({expires:"21/05/2023"});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("expires must be a valid ISO 8601 date string");
  });


  it("asserts allocation must be a valid type", async () => {
    const res =  await _sendRequest({allocation:"boo"});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("allocation must be one of the following values: SEQUENTIAL, RANDOM");
  });


  it("asserts correct defaults supplied to repository", async () => {
    const res =  await _sendRequest();

    expect(mocks.repository.save).toBeCalledWith({
      platform,
      sku,
      allocation: Allocation.SEQUENTIAL,
      expires: null,
      maximum: 1000,
      maximumForClaim: null,
      maximumForPurchase: null,
    } as BaseStockEntity);


    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("asserts correct values passed to repository", async () => {
    mocks.repository.save.mockResolvedValue(Promise.resolve({
      platform,
      sku,
      allocation: Allocation.RANDOM,
      expires: new Date('2023-03-17T12:21:36.000Z'),
      issued: 0,
      maximum: 100,
      availableForPurchase: 100,
      availableForClaim: 0,
    } as AvailableStock));

    const res =  await _sendRequest({
      allocation: Allocation.RANDOM,
      expires: "2023-03-17T12:21:36",
      maximum: 100,
    });

    expect(mocks.repository.save).toBeCalledWith({
      platform,
      sku,
      allocation: Allocation.RANDOM,
      expires: new Date('2023-03-17T12:21:36.000Z'),
      maximum: 100,
      maximumForClaim: null,
      maximumForPurchase: null,
    } as BaseStockEntity);


    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("asserts all stock information returned", async () => {
   

    mocks.repository.save.mockResolvedValue(Promise.resolve({
      platform,
      sku,
      allocation: Allocation.RANDOM,
      expires: new Date('2023-03-17T12:21:36.000Z'),
      issued: 0,
      maximum: 100,
      availableForPurchase: 56,
      availableForClaim: 0,
    } as AvailableStock));

    const res =  await _sendRequest({
      allocation: Allocation.RANDOM,
      expires: "2023-03-17T12:21:36",
      maximum: 100,
    });


    expect(res.statusCode).toEqual(StatusCodes.OK);
    expect(res._getJSON()).toEqual({
      allocation: "RANDOM",
      expires: "2023-03-17T12:21:36.000Z",
      issued: 0,
      maximum: 100,
      platform: "SKN",
      sku: "SAVE_SKU",
      availableForClaim: 0,
      availableForPurchase: 56
    });
  });

});
