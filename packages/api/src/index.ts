import express from "express";
import logger from "./utils/logger";
import cors from "cors";
import healthCheck from "./utils/healthCheck";
import config from "./config";
import routes from "./routes";
import morgan from "morgan";
import { BadRequestError, EntityNotFoundError } from "./errors";

const app = express();
const PORT_NUMBER = config.portNumber;

// middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

// routes
app.use(routes);

app.get("/.ping", (req, res) => {
  logger.info("Ping!");
  return res.status(200).json({
    message: "Pong!",
  });
});

app.get("/.health", async (req, res) => {
  let status: "UP" | "DOWN";
  try {
    await healthCheck();
    status = "UP";
  } catch (e) {
    logger.error(e);
    status = "DOWN";
  }
  return res.status(status === "UP" ? 200 : 503).json({
    status: status,
  });
});

// error handlers
app.use(function (err, req, res, next) {
  let statusCode = 500;
  let errMsg: string | undefined = undefined;
  if (err instanceof BadRequestError) {
    statusCode = 400;
    errMsg = err.message;
  } else if (err instanceof EntityNotFoundError) {
    statusCode = 404;
    errMsg = err.message;
  } else {
    logger.error(err);
  }
  if (res.headersSent) {
    return next(err);
  }
  return res.status(statusCode).json({
    message: errMsg || "An unexpected error has occurred.",
  });
});

app.listen(PORT_NUMBER, () =>
  logger.info(`Server started. Listening at ${PORT_NUMBER}.`)
);
