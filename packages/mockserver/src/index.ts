import express from "express";
import cors from "cors";
import morgan from "morgan";

const app = express();
const PORT_NUMBER = 8081;

// middlewares
app.use(cors());
app.use(express.json());

// routes
app.post("/callback", (req, res) => {
  console.log("/callback", req.body);
  return res.status(204).send();
});

app.post("/debit", (req, res) => {
  console.log("/debit", req.body);
  return res.status(204).send();
});

app.post("/releaselock", (req, res) => {
  console.log("/releaselock", req.body);
  return res.status(204).send();
});

// error handlers
app.use(function (err, req, res, next) {
  console.error(err);
  let statusCode = 500;
  let errMsg: string | undefined = undefined;
  if (res.headersSent) {
    return next(err);
  }
  return res.status(statusCode).json({
    message: errMsg || "An unexpected error has occurred.",
  });
});

app.listen(PORT_NUMBER, () =>
  console.log(`Server started. Listening at ${PORT_NUMBER}.`)
);
