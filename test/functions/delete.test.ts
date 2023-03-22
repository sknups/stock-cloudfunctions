import {testEnv} from '../test-env';
import { mocks } from "../mocks";
import { IN_STOCK_ENTITY } from '../test-data';
import * as MockExpressResponse from "mock-express-response";
import * as functions from '@google-cloud/functions-framework';
import { HttpFunction } from '@google-cloud/functions-framework';
import { getFunction } from '@google-cloud/functions-framework/testing';
import { getMockReq } from "@jest-mock/express";
import { StatusCodes } from "http-status-codes";
import { Delete } from "../../src/functions/delete";
import { AllConfig, loadConfig } from "../../src/config/all-config";
import { functionWrapper } from "../../src/helpers/wrapper";

const CONFIG: Promise<AllConfig> = loadConfig(testEnv);

const {platform, sku} = IN_STOCK_ENTITY

const handler: HttpFunction = async (req, res) => functionWrapper(Delete, req, res, CONFIG);
functions.http('stock-delete', handler);

let instance :HttpFunction;
let res = new MockExpressResponse();
let req;

describe("function - delete", () => {
  beforeEach(function () {
    instance = getFunction('stock-delete') as HttpFunction;
    res = new MockExpressResponse();

    req = getMockReq({ 
      path: `/${platform}/${sku}`,
      method: "DELETE" 
    });

    mocks.mockClear();
  });

  it("invalid method returns 405", async () => {
    req.method = "PUT"
    
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.METHOD_NOT_ALLOWED);
  });

  it("returns 403 if called by retailer", async () => {
    req.path = `/retailer/${platform}/${sku}`
    
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.FORBIDDEN);
  });


  it("returns 404 if sku does not exist", async () => {
    req.path =  `/${platform}/UNKNOWN`
    await instance(req, res);

    expect(mocks.repository.exists).toBeCalledWith(platform, 'UNKNOWN');
    expect(mocks.repository.delete).toBeCalledTimes(0)

    expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
  });

  it("calls repository delete", async () => { 
    await instance(req, res);

    expect(mocks.repository.exists).toBeCalledWith(platform, sku);
    expect(mocks.repository.delete).toBeCalledWith(platform, sku);

    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

});
