import express from "express";
import { BadRequestError } from "../errors";
import platformFeeRequestRepository, {
  PlatformFee,
} from "../repositories/platform-fee-request.repository";
import platformFeeService from "../services/platform-fee.service";
import withErrorHandling from "../utils/withErrorHandling";

const platformFeeRoute = express.Router();

platformFeeRoute.post(
  "/",
  withErrorHandling(async (req, res) => {
    const platformFee = req.body;
    if (!PlatformFee.guard(platformFee)) {
      throw new BadRequestError("Platform fee is improperly formatted.");
    }
    await platformFeeService.chargePlatformFee(
      platformFee,
      "someHardCodedUserId"
    );
    return res.status(204).send();
  })
);

platformFeeRoute.get(
  "/",
  withErrorHandling(async (req, res) => {
    const r = await platformFeeRequestRepository.scan();
    return res.status(200).send(r);
  })
);

export default platformFeeRoute;
