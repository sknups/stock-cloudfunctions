import {testEnv} from '../test-env';
import { mocks } from "../mocks";
import { IN_STOCK_ENTITY } from '../test-data';
import * as MockExpressResponse from "mock-express-response";
import * as functions from '@google-cloud/functions-framework';
import { HttpFunction } from '@google-cloud/functions-framework';
import { getFunction } from '@google-cloud/functions-framework/testing';
import { getMockReq } from "@jest-mock/express";
import { StatusCodes } from "http-status-codes";
import { Get } from "../../src/functions/get";
import { AllConfig, loadConfig } from "../../src/config/all-config";
import { functionWrapper } from "../../src/helpers/wrapper";

const CONFIG: Promise<AllConfig> = loadConfig(testEnv);

const handler: HttpFunction = async (req, res) => functionWrapper(Get, req, res, CONFIG);
functions.http('stock-get', handler);

let res = new MockExpressResponse();
let req;
let instance :HttpFunction;

const {platform, sku} = IN_STOCK_ENTITY

describe("function - get", () => {
  beforeEach(function () {
    instance = getFunction('stock-get') as HttpFunction;
    res = new MockExpressResponse();

    req = getMockReq({ 
      path: `/${platform}/${sku}`,
      method: "GET" 
    });

    mocks.mockClear();
  });

  it("invalid method returns 405", async () => {
    req.method = 'POST'
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.METHOD_NOT_ALLOWED);
  });

  it("returns 400 if no sku is supplied in path", async () => {
    req.path = "/"
    
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("STOCK_00300");
  });

  it("returns a 404 error if the stock can not be found", async () => {
    req.path = `/${platform}/UNKNOWN`;
    
    await instance(req, res);
    expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
    expect(res._getString()).toContain("STOCK_00400");
  });


  it("returns all stock information for a sku when called internally", async () => {
    await instance(req, res);

    expect(mocks.repository.get).toBeCalledWith(platform, sku);
    expect(res.statusCode).toEqual(StatusCodes.OK);
    expect(res._getJSON()).toEqual({
      "allocation": "SEQUENTIAL",
      "available": 990,
      "expires": null,
      "issued": 10,
      "maximum": 1000,
      "platform": "SKN",
      "reserved": 0,
      "sku":"SKU_001",
      "stock": 990,
      "withheld": 0,
    });
  });

  it("returns limited stock information for a sku when called by retailer", async () => {
    req.path = `/retailer/${platform}/${sku}`;

    await instance(req, res);

    expect(mocks.repository.get).toBeCalledWith(platform, sku);
    expect(res.statusCode).toEqual(StatusCodes.OK);
    expect(res._getJSON()).toEqual({
      "platform": "SKN",
      "sku":"SKU_001",
      "stock": 990,
      "available": 990,
    });
  });

  it("defaults to SKN platform if not supplied", async () => {
    req.path = `/${sku}`;

    await instance(req, res);

    expect(mocks.repository.get).toBeCalledWith(platform, sku);
    expect(res.statusCode).toEqual(StatusCodes.OK);
    expect(res._getJSON()).toEqual({
      "allocation": "SEQUENTIAL",
      "available": 990,
      "expires": null,
      "issued": 10,
      "maximum": 1000,
      "platform": "SKN",
      "reserved": 0,
      "sku":"SKU_001",
      "stock": 990,
      "withheld": 0,
    });
  });

  it("defaults to SKN platform if not supplied by retailer", async () => {
    req.path = `/retailer/${sku}`;
    
    await instance(req, res);

    expect(mocks.repository.get).toBeCalledWith(platform, sku);
    expect(res.statusCode).toEqual(StatusCodes.OK);
    expect(res._getJSON()).toEqual({
      "platform": "SKN",
      "sku":"SKU_001",
      "stock": 990,
      "available": 990,
    });
  });


});
