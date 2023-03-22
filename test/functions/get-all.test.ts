import { testEnv } from "../test-env";
import { mocks } from "../mocks";
import * as MockExpressResponse from "mock-express-response";
import * as functions from "@google-cloud/functions-framework";
import { HttpFunction } from "@google-cloud/functions-framework";
import { getFunction } from "@google-cloud/functions-framework/testing";
import { getMockReq } from "@jest-mock/express";
import { StatusCodes } from "http-status-codes";
import { GetAll } from "../../src/functions/get-all";
import { AllConfig, loadConfig } from "../../src/config/all-config";
import { functionWrapper } from "../../src/helpers/wrapper";

const CONFIG: Promise<AllConfig> = loadConfig(testEnv);

const handler: HttpFunction = async (req, res) => functionWrapper(GetAll, req, res, CONFIG);
functions.http("stock-get-all", handler);

const platform = "SKN";

let instance: HttpFunction;
let res = new MockExpressResponse();
let req;

describe("function - get-all", () => {
  beforeEach(function () {
    instance = getFunction("stock-get-all") as HttpFunction;
    res = new MockExpressResponse();

    req = getMockReq({
      path: `/${platform}`,
      method: "GET",
    });

    mocks.mockClear();
  });

  it("invalid method returns 405", async () => {
    req.method = "PUT";

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.METHOD_NOT_ALLOWED);
  });

  it("returns 400 if platform missing from path", async () => {
    req.path = "/";

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
  });

  it("returns empty array no entries found", async () => {
    req.path = "/UNKNOWN";

    await instance(req, res);

    expect(res._getJSON()).toEqual([]);
    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("calls the repository with the correct platform", async () => {
    await instance(req, res);
    expect(mocks.repository.getAll).toBeCalledWith(platform);
  })

  it("returns all stock information when called internally", async () => {
    await instance(req, res);

    expect(res._getJSON()).toEqual([
      {
        allocation: "SEQUENTIAL",
        available: 990,
        expires: null,
        issued: 10,
        maximum: 1000,
        platform: "SKN",
        reserved: 0,
        sku: "SKU_001",
        stock: 990,
        withheld: 0,
      },
      {
        allocation: "SEQUENTIAL",
        available: 890,
        expires: null,
        issued: 10,
        maximum: 1000,
        platform: "SKN",
        reserved: 100,
        sku: "SKU_002",
        stock: 890,
        withheld: 0,
      },
      {
        allocation: "SEQUENTIAL",
        available: 790,
        expires: null,
        issued: 10,
        maximum: 1000,
        platform: "SKN",
        reserved: 0,
        sku: "SKU_003",
        stock: 790,
        withheld: 200,
      },
    ]);
    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("returns limited stock information when called by retailer", async () => {
    req.path= `/retailer/${platform}`
    
    await instance(req, res);

    expect(res._getJSON()).toEqual([
      {
        available: 990,
        platform: "SKN",
        sku: "SKU_001",
        stock: 990,
      },
      {
        available: 890,
        platform: "SKN",
        sku: "SKU_002",
        stock: 890,
      },
      {
        available: 790,
        platform: "SKN",
        sku: "SKU_003",
        stock: 790,
      },
    ]);
    expect(res.statusCode).toEqual(StatusCodes.OK);
  });
});
