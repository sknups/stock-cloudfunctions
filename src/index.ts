if (process.env.NODE_ENV == "development") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("source-map-support").install();
  require("dotenv/config");
}

import "reflect-metadata";
import { HttpFunction } from "@google-cloud/functions-framework";
import { AllConfig, loadConfig } from "./config/all-config";
import { functionWrapper } from "./helpers/wrapper";
import logger from "./helpers/logger";

const CONFIG: Promise<AllConfig> = loadConfig(process.env);
CONFIG.catch(logger.error);

export const save: HttpFunction = async (req, res) =>
  functionWrapper(
    (await import("./functions/save.js")).Save,
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

//TODO - remove when callers moved to createIssue
export const update: HttpFunction = async (req, res) =>
  functionWrapper(
    (await import("./functions/update.js")).Update,
    req,
    res,
    CONFIG
  );

export const createIssue: HttpFunction = async (req, res) =>
  functionWrapper(
    (await import("./functions/create-issue.js")).CreateIssue,
    req,
    res,
    CONFIG
  );

export const deleteStock: HttpFunction = async (req, res) =>
  functionWrapper(
    (await import("./functions/delete.js")).Delete,
    req,
    res,
    CONFIG
  );

  export const updateAll: HttpFunction = async (req, res) =>
  functionWrapper(
    (await import("./functions/update-all.js")).UpdateAll,
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
    case "stock-save":
      await save(req, res);
      break;
    case "stock-get-all":
      await getAll(req, res);
      break;
    case "stock-get":
      await get(req, res);
      break;
    case "stock-create-issue":
      await createIssue(req, res);
      break;
    case "stock-delete":
      await deleteStock(req, res);
      break;
    //TODO remove when callers moved to stock-create-issue"
    case "stock-update":
      await update(req, res);
      break;
    case "stock-update-all":
      await updateAll(req, res);
      break;
    default:
      res.status(404).send(`Endpoint ${path} not found\n`);
  }
};
