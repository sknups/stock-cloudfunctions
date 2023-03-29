import {testEnv} from '../test-env';
import { mocks } from "../mocks";
import { IN_STOCK_ENTITY, OUT_OF_STOCK_ENTITY } from '../test-data';
import * as MockExpressResponse from "mock-express-response";
import * as functions from '@google-cloud/functions-framework';
import { HttpFunction } from '@google-cloud/functions-framework';
import { getFunction } from '@google-cloud/functions-framework/testing';
import { getMockReq } from "@jest-mock/express";
import { StatusCodes } from "http-status-codes";
import { Update } from "../../src/functions/update";
import { AllConfig, loadConfig } from "../../src/config/all-config";
import { functionWrapper } from "../../src/helpers/wrapper";

const CONFIG: Promise<AllConfig> = loadConfig(testEnv);

const handler: HttpFunction = async (req, res) => functionWrapper(Update, req, res, CONFIG);
functions.http('stock-update', handler);

let res = new MockExpressResponse();
let req;
let instance :HttpFunction;

const {sku} = IN_STOCK_ENTITY

describe("function - update", () => {
  beforeEach(function () {
    instance = getFunction('stock-update') as HttpFunction;
    res = new MockExpressResponse();

    req = getMockReq({ 
      path: `/${sku}`,
      method: "PUT" 
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

  it("returns 403 if called by retailer", async () => {
    req.path = `/retailer/${sku}`
    
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.FORBIDDEN);
    expect(res._getString()).toContain("STOCK_00301");
  });


  it("returns a 404 error if the stock can not be found", async () => {
    req.path = `/UNKNOWN`;
    
    await instance(req, res);
    expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
    expect(res._getString()).toContain("STOCK_00400");
  });

  it("returns a 403 error if out of stock", async () => {
    req.path = `/${OUT_OF_STOCK_ENTITY.sku}`;
    
    await instance(req, res);
    expect(res.statusCode).toEqual(StatusCodes.FORBIDDEN);
    expect(res._getString()).toContain("STOCK_00500");
  });

  it("defaults to 'SKN' platform and a 'purchase' ", async () => {
    
    await instance(req, res);

    expect(mocks.repository.issue).toBeCalledWith('SKN',sku,'purchase')

    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("includes issue in the response", async () => {
    
    await instance(req, res);

    expect(res._getJSON()).toEqual({
      "allocation": "SEQUENTIAL",
      "available": 990,
      "expires": null,
      "issued": 11,
      "issue": 11,
      "maximum": 1000,
      "platform": "TEST",
      "reserved": 0,
      "sku":"SKU_001",
      "stock": 990,
      "withheld": 0,
    });
  });

});
