import {testEnv} from '../test-env';

import * as MockExpressResponse from "mock-express-response";
import * as functions from '@google-cloud/functions-framework';
import { HttpFunction } from '@google-cloud/functions-framework';
import { getFunction } from '@google-cloud/functions-framework/testing';
import { getMockReq } from "@jest-mock/express";
import { StatusCodes } from "http-status-codes";
import { Create } from "../../src/functions/create";
import { AllConfig, loadConfig } from "../../src/config/all-config";
import { functionWrapper } from "../../src/helpers/wrapper";
import { StockRepository } from '../../src/persistence/stock-repository';

jest.mock('../../src/persistence/stock-repository');

let res = new MockExpressResponse();

const CONFIG: Promise<AllConfig> = loadConfig(testEnv);

const handler: HttpFunction = async (req, res) => functionWrapper(Create, req, res, CONFIG);
functions.http('stock-create', handler);

const CREATE_REQUEST = () => {
  return {
    sku: "SKU_0001",
    operation: "CREATE",
    maxQty: 54,
  };
};

const RESET_REQUEST = () => {
  return {
    sku: "SKU_0001",
    operation: "RESET",
    maxQty: 65,
  };
};

describe("function - create", () => {
  beforeEach(function () {
    res = new MockExpressResponse();
  });

  it("invalid method returns 405", async () => {
    const req = getMockReq({ method: "PUT" });

    const instance = getFunction("stock-create") as HttpFunction;

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.METHOD_NOT_ALLOWED);
  });

  it("returns 400 if sku not supplied", async () => {
    const body = CREATE_REQUEST();
    body["sku"] = "";

    const req = getMockReq({ method: "POST", body });

    const instance = getFunction("stock-create") as HttpFunction;

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toEqual(
      expect.stringContaining("sku should not be empty")
    );
  });

  it("returns 400 if operation not supplied", async () => {
    const body = CREATE_REQUEST();
    body["operation"] = "";

    const req = getMockReq({ method: "POST", body });

    const instance = getFunction("stock-create") as HttpFunction;

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toEqual(
      expect.stringContaining("operation must be one of the following values: RESET, CREATE")
    );
  });

  it("returns 400 if operation is invalid", async () => {
    const body = CREATE_REQUEST();
    body["operation"] = "boo";

    const req = getMockReq({ method: "POST", body });

    const instance = getFunction("stock-create") as HttpFunction;

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toEqual(
      expect.stringContaining("operation must be one of the following values: RESET, CREATE")
    );
  });

  it("creates stock if operation is 'CREATE'", async () => {
    const body = CREATE_REQUEST();

    const req = getMockReq({ method: "POST", body });

    const instance = getFunction("stock-create") as HttpFunction;

    const createSpy = jest.spyOn(StockRepository.prototype, 'create');
   
    await instance(req, res);

    expect(createSpy).toBeCalledWith(body.sku, body.maxQty)

    expect(res.statusCode).toEqual(StatusCodes.OK);
  
  });

  it("creates stock if operation is 'RESET'", async () => {
    const body = RESET_REQUEST();

    const req = getMockReq({ method: "POST", body });

    const instance = getFunction("stock-create") as HttpFunction;

    const updateSpy = jest.spyOn(StockRepository.prototype, 'update');
   
    await instance(req, res);

    expect(updateSpy).toBeCalledWith(body.sku, body.maxQty)

    expect(res.statusCode).toEqual(StatusCodes.OK);
  
  });
});
