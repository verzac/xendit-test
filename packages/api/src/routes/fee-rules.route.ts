import express from "express";
import { BadRequestError, EntityNotFoundError } from "../errors";
import feeRuleRepository, {
  FeeRule,
} from "../repositories/fee-rule.repository";
import withErrorHandling from "../utils/withErrorHandling";

const feeRulesRouter = express.Router();

feeRulesRouter.post(
  "/",
  withErrorHandling(async (req, res) => {
    const feeRule = req.body;
    if (!FeeRule.guard(feeRule)) {
      throw new BadRequestError("Fee rule is improperly formatted.");
    }
    const resp = await feeRuleRepository.create(feeRule);
    return res.status(200).send(resp);
  })
);

feeRulesRouter.get(
  "/:id",
  withErrorHandling(async (req, res) => {
    const { id } = req.params;
    const feeRule = await feeRuleRepository.read(id);
    if (!feeRule) {
      throw new EntityNotFoundError(`Cannot find fee rule with ID ${id}.`);
    }
    return res.status(200).send(feeRule);
  })
);

feeRulesRouter.get(
  "/",
  withErrorHandling(async (req, res) => {
    return res.status(200).send(await feeRuleRepository.scan());
  })
);

export default feeRulesRouter;
