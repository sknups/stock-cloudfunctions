import { testEnv } from "../test-env";
import { mocks } from "../mocks";
import { IN_STOCK_ENTITY } from "../test-data";
import * as MockExpressResponse from "mock-express-response";
import * as functions from "@google-cloud/functions-framework";
import { HttpFunction } from "@google-cloud/functions-framework";
import { getFunction } from "@google-cloud/functions-framework/testing";
import { getMockReq } from "@jest-mock/express";
import { StatusCodes } from "http-status-codes";
import { UpdateAll } from "../../src/functions/update-all";
import { AllConfig, loadConfig } from "../../src/config/all-config";
import { functionWrapper } from "../../src/helpers/wrapper";
import { Allocation } from "../../src/dto/internal/save-stock-request";

const CONFIG: Promise<AllConfig> = loadConfig(testEnv);

const handler: HttpFunction = async (req, res) =>
  functionWrapper(UpdateAll, req, res, CONFIG);
functions.http("stock-update-all", handler);

let res = new MockExpressResponse();
let req;
let instance: HttpFunction;

const { sku, platform } = IN_STOCK_ENTITY;

describe("function - update-all", () => {
  beforeEach(function () {
    instance = getFunction("stock-update-all") as HttpFunction;
    res = new MockExpressResponse();

    req = getMockReq({
      path: `/${platform}/${sku}`,
      method: "PUT",
      body: { maximum: 1000 },
    });

    mocks.mockClear();
  });

  it("invalid method returns 405", async () => {
    req.method = "POST";
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.METHOD_NOT_ALLOWED);
  });

  it("returns 400 if no sku or platform is supplied in path", async () => {
    req.path = "/";

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("STOCK_00300");
  });

  it("returns 403 if called by retailer", async () => {
    req.path = `/retailer/${req.path}`;

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.FORBIDDEN);
    expect(res._getString()).toContain("STOCK_00301");
  });


  it("asserts maximum must be a number", async () => {
    req.body = {maximum: "test"}
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("maximum must be an integer number");
  });

  it("asserts maximum must be a integer", async () => {
    req.body = {maximum: 12.55}
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("maximum must be an integer number");
  });

  it("asserts maximum must be greater than 0", async () => {
    req.body = {maximum: 0}
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("maximum must be a positive number");
  });

  it("asserts withheld must be a number", async () => {
    req.body = {maximum: 100, withheld: "not a number"}
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("withheld must be an integer number");
  });

  it("asserts withheld must be a integer", async () => {
    req.body = {maximum: 100, withheld: 23.55}
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("withheld must be an integer number");
  });

  it("asserts withheld cant be less than zero", async () => {
    req.body = {maximum: 100, withheld: -1}
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("withheld must not be less than 0");
  });

  it("asserts withheld can be zero", async () => {
    req.body = {maximum: 100, withheld: 0}

    mocks.repository.set.mockResolvedValue(Promise.resolve({
      platform,
      sku,
      allocation: Allocation.SEQUENTIAL,
      expires: null,
      issued: 0,
      maximum: 100,
      available: 100,
      withheld: 0,
      reservedForClaim: 0,
    }));

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("asserts reserved must be a number", async () => {
    req.body = {maximum: 100, reserved: "not a number"}
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("reserved must be an integer number");
  });

  it("asserts reserved must be a integer", async () => {
    req.body = {maximum: 100, reserved: 23.55}
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("reserved must be an integer number");
  });

  it("asserts reserved cant be less than zero", async () => {
    req.body = {maximum: 100, reserved: -1}
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("reserved must not be less than 0");
  });

  it("asserts reserved can be zero", async () => {
    req.body = {maximum: 100, reserved: 0}

    mocks.repository.set.mockResolvedValue(Promise.resolve({
      platform,
      sku,
      allocation: Allocation.SEQUENTIAL,
      expires: null,
      issued: 0,
      maximum: 100,
      available: 100,
      withheld: 0,
      reservedForClaim: 0,
    }));

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("asserts expires must be a valid ISO 8601 date", async () => {
    req.body = {maximum: 100, expires: "21/05/2023"}
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("expires must be a valid ISO 8601 date string");
  });


  it("asserts allocation must be a valid type", async () => {
    req.body = {maximum: 100, allocation: 'boo'}
    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("allocation must be one of the following values: SEQUENTIAL, RANDOM");
  });

  it("asserts only maximum is required", async () => {
    req.body = {maximum: 100}

    mocks.repository.set.mockResolvedValue(Promise.resolve({
      platform,
      sku,
      allocation: Allocation.SEQUENTIAL,
      expires: null,
      issued: 0,
      maximum: 100,
      available: 100,
      withheld: 0,
      reservedForClaim: 0,
    }));

    await instance(req, res);
    expect(res.statusCode).toEqual(StatusCodes.OK);
  });


  it("passes correct data to repository", async () => {
    const body = {
      issued: 15,
      reserved: 10,
      withheld: 23,
      maximum: 20000,
      allocation: Allocation.RANDOM,
      expires: "2023-12-01",
    };

    //Ignoring expires in this test
    const available =
      body.maximum - body.issued - body.reserved - body.withheld;

    mocks.repository.set.mockResolvedValue({
      sku,
      platform,
      reservedForClaim: body.reserved,
      withheld: body.withheld,
      expires: new Date(body.expires),
      maximum: body.maximum,
      allocation: body.allocation,
      issued: body.issued,
      available,
    });

    req.body = body;
    await instance(req, res);

    expect(mocks.repository.set).toBeCalledWith({
      allocation: "RANDOM",
      expires: new Date("2023-12-01"),
      issued: 15,
      maximum: 20000,
      platform: "TEST",
      reservedForClaim: 10,
      sku: "SKU_001",
      withheld: 23,
    });

    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("correct data is returned", async () => {
    const body = {
      issued: 15,
      reserved: 10,
      withheld: 23,
      maximum: 20000,
      allocation: Allocation.RANDOM,
      expires: "2023-12-01",
    };

    //Ignoring expires in this test
    const available =
      body.maximum - body.issued - body.reserved - body.withheld;

    mocks.repository.set.mockResolvedValue({
      sku,
      platform,
      reservedForClaim: body.reserved,
      withheld: body.withheld,
      expires: new Date(body.expires),
      maximum: body.maximum,
      allocation: body.allocation,
      issued: body.issued,
      available,
    });

    req.body = body;
    await instance(req, res);

    expect(res._getJSON()).toEqual({
      allocation: "RANDOM",
      available: 19952,
      expires: "2023-12-01T00:00:00.000Z",
      issued: 15,
      maximum: 20000,
      platform: "TEST",
      reserved: 10,
      sku: "SKU_001",
      stock: 19952,
      withheld: 23,
    });
  });
});
