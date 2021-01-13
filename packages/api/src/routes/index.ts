import express from "express";
import feeRulesRouter from "./fee-rules.route";
import platformFeeRoute from "./platform-fee.route";

const routes = express.Router();

routes.use("/fee-rules", feeRulesRouter);
routes.use("/platform-fees", platformFeeRoute);

export default routes;
