import "reflect-metadata";
import { HttpFunction } from "@google-cloud/functions-framework";
import { AllConfig, loadConfig } from "./config/all-config";
import { functionWrapper } from "./helpers/wrapper";
import logger from "./helpers/logger";

if (process.env.NODE_ENV == "development") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("source-map-support").install();
  require("dotenv/config");
}

const CONFIG: Promise<AllConfig> = loadConfig(process.env);
CONFIG.catch(logger.error);

export const create: HttpFunction = async (req, res) =>
  functionWrapper(
    (await import("./functions/create.js")).Create,
    req,
    res,
    CONFIG
  );

export const deleteAll: HttpFunction = async (req, res) =>
  functionWrapper(
    (await import("./functions/delete-all.js")).DeleteAll,
    req,
    res,
    CONFIG
  );

export const getAll: HttpFunction = async (req, res) =>
  functionWrapper(
    (await import("./functions/get-all.js")).GetAll,
    req,
    res,
    CONFIG
  );

export const get: HttpFunction = async (req, res) =>
  functionWrapper(
    (await import("./functions/get.js")).Get,
    req,
    res,
    CONFIG
  );

export const update: HttpFunction = async (req, res) =>
  functionWrapper(
    (await import("./functions/update.js")).Update,
    req,
    res,
    CONFIG
  );

/**
 * For dev testing only
 *
 * @param req
 * @param res
 */
export const devRouter: HttpFunction = async (req, res) => {
  const path = req.path.split("/")[1];
  switch (path) {
    case "stock-create":
      await create(req, res);
      break;
    case "stock-delete-all":
      await deleteAll(req, res);
      break;
    case "stock-get-all":
      await getAll(req, res);
      break;
    case "stock-get":
      await get(req, res);
      break;
    case "stock-update":
      await update(req, res);
      break;
    default:
      res.status(404).send(`Endpoint ${path} not found\n`);
  }
};
