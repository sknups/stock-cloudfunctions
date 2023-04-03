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

const handler: HttpFunction = async (req, res) => functionWrapper(UpdateAll, req, res, CONFIG);
functions.http("stock-update-all", handler);

const { sku, platform } = IN_STOCK_ENTITY;

function _testBody(): any {
  return {
    maximum: 1000,
    issued: 0,
    issuedForClaim: 0,
    issuedForPurchase: 0
  };
}

async function _sendRequest(
  bodyOverrides: any = {},
  bodyModifier = (_body: any) => { },
  platform = IN_STOCK_ENTITY.platform,
  sku = IN_STOCK_ENTITY.sku,
): Promise<MockExpressResponse> {
  const body = { ..._testBody(), ...bodyOverrides };
  bodyModifier(body);
  const req = getMockReq({path:`/${platform}/${sku}`, method: 'PUT', body});
  const res = new MockExpressResponse();
  const instance = getFunction('stock-update-all') as HttpFunction;
  await instance(req, res);
  return res;
}

describe("function - update-all", () => {

  beforeEach(function() {
    mocks.repository.set.mockResolvedValue({
      sku,
      platform,
      expires: null,
      maximum: _testBody().maximum,
      maximumForClaim: null,
      maximumForPurchase: null,
      allocation: 'SEQUENTIAL',
      issued: 0,
      issuedForClaim: 0,
      issuedForPurchase: 0,
      available: _testBody().maximum,
    });
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
    const instance = getFunction('stock-update-all') as HttpFunction;

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.METHOD_NOT_ALLOWED);
  });

  it("returns 400 if no sku or platform is supplied in path", async () => {
    const req = getMockReq({ 
      path: `/`,
      method: "PUT",
      body: {maximum: 1000},
    });
    const res = new MockExpressResponse();
    const instance = getFunction('stock-update-all') as HttpFunction;

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
    const instance = getFunction('stock-update-all') as HttpFunction;

    await instance(req, res);

    expect(res.statusCode).toEqual(StatusCodes.FORBIDDEN);
    expect(res._getString()).toContain("STOCK_00301");
  });


  it("asserts maximum must be a number", async () => {
    const res = await _sendRequest( {maximum: 'invalid'})

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("maximum must be an integer number");
  });

  it("asserts maximum must be a integer", async () => {
    const res = await _sendRequest( {maximum: 12.5})

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("maximum must be an integer number");
  });

  it("asserts maximum must be greater than 0", async () => {
    const res = await _sendRequest( {maximum: 0})

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

    expect(mocks.repository.set).toBeCalledWith(expect.objectContaining({
      maximumForClaim: 0,
    }));

    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("asserts issued must be a number", async () => {
    const res =  await _sendRequest({issued:"TEST"});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("issued must be an integer number");
  });

  it("asserts issued must be a integer", async () => {
    const res =  await _sendRequest({issued:1.23});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("issued must be an integer number");
  });

  it("asserts issued must be positive", async () => {
    const res =  await _sendRequest({issued:-1});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("issued must not be less than 0");
  });


  it("asserts issued is required", async () => {
    const res =  await _sendRequest({}, body => delete body.issued);
    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("issued must not be less than 0");
  });


  it("asserts issued can be zero", async () => {
    const res =  await _sendRequest({issued:0});

    expect(mocks.repository.set).toBeCalledWith(expect.objectContaining({
      issued: 0,
    }));

    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("asserts issuedForPurchase must be a number", async () => {
    const res =  await _sendRequest({issuedForPurchase:"TEST"});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("issuedForPurchase must be an integer number");
  });

  it("asserts issuedForPurchase must be a integer", async () => {
    const res =  await _sendRequest({issuedForPurchase:1.23});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("issuedForPurchase must be an integer number");
  });

  it("asserts issuedForPurchase must be positive", async () => {
    const res =  await _sendRequest({issuedForPurchase:-1});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("issuedForPurchase must not be less than 0");
  });


  it("asserts issuedForPurchase is required", async () => {
    const res =  await _sendRequest({}, body => delete body.issuedForPurchase);
    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("issuedForPurchase must not be less than 0");
  });


  it("asserts issuedForPurchase can be zero", async () => {
    const res =  await _sendRequest({issuedForPurchase:0});

    expect(mocks.repository.set).toBeCalledWith(expect.objectContaining({
      issuedForPurchase: 0,
    }));

    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("asserts issuedForClaim must be a number", async () => {
    const res =  await _sendRequest({issuedForClaim:"TEST"});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("issuedForClaim must be an integer number");
  });

  it("asserts issuedForClaim must be a integer", async () => {
    const res =  await _sendRequest({issuedForClaim:1.23});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("issuedForClaim must be an integer number");
  });

  it("asserts issuedForClaim must be positive", async () => {
    const res =  await _sendRequest({issuedForClaim:-1});

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("issuedForClaim must not be less than 0");
  });


  it("asserts issuedForClaim is required", async () => {
    const res =  await _sendRequest({}, body => delete body.issuedForClaim);
    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("issuedForClaim must not be less than 0");
  });


  it("asserts issuedForClaim can be zero", async () => {
    const res =  await _sendRequest({issuedForClaim:0});

    expect(mocks.repository.set).toBeCalledWith(expect.objectContaining({
      issuedForClaim: 0,
    }));

    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("asserts maximumForClaim can be null", async () => {
    const res =  await _sendRequest({maximumForClaim:null});

    expect(mocks.repository.set).toBeCalledWith(expect.objectContaining({
      maximumForClaim: null,
    }));

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

    expect(mocks.repository.set).toBeCalledWith(expect.objectContaining({
      maximumForPurchase: 0,
    }));

    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("asserts maximumForPurchase can be null", async () => {
    const res =  await _sendRequest({maximumForClaim:null});

    expect(mocks.repository.set).toBeCalledWith(expect.objectContaining({
      maximumForPurchase: null,
    }));

    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("asserts expires must be a valid ISO 8601 date", async () => {
    const res = await _sendRequest({ expires: "21/05/2023"})

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("expires must be a valid ISO 8601 date string");
  });


  it("asserts allocation must be a valid type", async () => {
    const res = await _sendRequest({ allocation: "boo"})

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res._getString()).toContain("allocation must be one of the following values: SEQUENTIAL, RANDOM");
  });


  it("passes correct data to repository", async () => {
    const body = {
      issued: 15,
      maximum: 20000,
      maximumForClaim: 1,
      maximumForPurchase: 100,
      issuedForClaim: 1,
      issuedForPurchase: 14,
      allocation: Allocation.RANDOM,
      expires: "2023-12-01",
    };

    //Ignoring expires in this test
    const available = body.maximum - body.issued;

    mocks.repository.set.mockResolvedValue({
      sku,
      platform,
      expires: new Date(body.expires),
      maximum: body.maximum,
      maximumForClaim: body.maximumForClaim,
      maximumForPurchase: body.maximumForPurchase,
      allocation: body.allocation,
      issued: body.issued,
      issuedForClaim: body.issuedForClaim,
      issuedForPurchase: body.issuedForPurchase,
      available,
    });

    const res = await _sendRequest({...body})

    expect(mocks.repository.set).toBeCalledWith({
      allocation: "RANDOM",
      expires: new Date("2023-12-01"),
      issued: 15,
      issuedForClaim: 1,
      issuedForPurchase: 14,
      maximum: 20000,
      maximumForClaim: 1,
      maximumForPurchase: 100,
      platform: "TEST",
      sku: "SKU_001",
    });

    expect(res.statusCode).toEqual(StatusCodes.OK);
  });

  it("correct data is returned", async () => {
    const body = {
      issued: 15,
      maximum: 20000,
      allocation: Allocation.RANDOM,
      expires: "2023-12-01",
    };

    //Ignoring expires in this test
    const availableForPurchase = body.maximum - body.issued;

    mocks.repository.set.mockResolvedValue({
      sku,
      platform,
      expires: new Date(body.expires),
      maximum: body.maximum,
      allocation: body.allocation,
      issued: body.issued,
      availableForPurchase,
      availableForClaim: 0
    });

    const res = await _sendRequest({...body})

    expect(res._getJSON()).toEqual({
      allocation: "RANDOM",
      availableForPurchase: 19985,
      availableForClaim: 0,
      expires: "2023-12-01T00:00:00.000Z",
      issued: 15,
      maximum: 20000,
      platform: "TEST",
      sku: "SKU_001",
    });
  });
});
