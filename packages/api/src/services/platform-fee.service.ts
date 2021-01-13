import axios from "axios";
import { BadRequestError, TransactionServiceError } from "../errors";
import { DataEntity } from "../repositories/base.repository";
import feeRuleRepository, {
  FeeRuleT,
} from "../repositories/fee-rule.repository";
import platformFeeRequestRepository, {
  PlatformFeeRequestT,
  PlatformFeeT,
} from "../repositories/platform-fee-request.repository";
import logger from "../utils/logger";
import platformService from "./platform.service";
import transactionService from "./transaction.service";

function calculateAmountToCharge(
  platformFee: PlatformFeeT,
  feeRule: DataEntity<FeeRuleT>
): number {
  let amountToCharge: number;
  switch (feeRule.routes.unit) {
    case "flat":
      amountToCharge = feeRule.routes.amount;
      break;
    case "percent":
      amountToCharge = Math.ceil(
        (platformFee.paidAmount * feeRule.routes.amount) / 100
      );
      break;
    default:
      throw new Error(
        `Invalid unit ${feeRule.routes.unit} for fee rule ID ${feeRule.id}.`
      );
  }
  return amountToCharge;
}

async function notifyState(
  callbackUrl: string,
  platformFeeRequest: PlatformFeeRequestT
) {
  try {
    await axios.post(callbackUrl, platformFeeRequest);
  } catch (e) {
    logger.error(e);
  }
}

async function chargePlatformFee(
  platformFee: PlatformFeeT,
  platformUserId: string
): Promise<void> {
  const feeRule = await feeRuleRepository.read(platformFee.ruleId);
  const {
    fee_charge_state_callback_url: stateCallbackUrl,
  } = await platformService.getPlatformConfig(platformUserId);
  if (!feeRule) {
    throw new BadRequestError(
      `Cannot find feeRule with ruleId ${platformFee.ruleId}`
    );
  }
  if (feeRule.routes.currency !== platformFee.paidCurrency) {
    throw new BadRequestError(
      `Cannot use fee rule ${feeRule.id} to charge platform fee due to currency mismatch. Fee rule currency: ${feeRule.routes.currency} | Payment currency: ${platformFee.paidCurrency}`
    );
  }
  const amountToCharge = calculateAmountToCharge(platformFee, feeRule);
  const feeRequest = await platformFeeRequestRepository.create({
    ...platformFee,
    state: "PENDING",
    extraInfo: undefined,
    calculatedFee: {
      currency: feeRule.routes.currency,
      amount: amountToCharge,
    },
  });
  notifyState(stateCallbackUrl, feeRequest);
  try {
    await transactionService.debitAccount({
      fromUserId: platformFee.forUserId,
      toUserId: platformUserId,
      amount: amountToCharge,
      currency: feeRule.routes.currency,
    });
    if (platformFee.blockedTransactionId) {
      await transactionService.removePendingFlagFromTransaction(
        platformFee.blockedTransactionId
      );
    }
  } catch (e) {
    logger.error(e);
    feeRequest.state = "ERROR";
    if (e instanceof TransactionServiceError) {
      feeRequest.extraInfo = `Fee charge failed. Reason: ${e.message}`;
    } else {
      feeRequest.extraInfo = `Fee charge failed. Unknown exception occurred - please get in touch with support.`;
    }
    await platformFeeRequestRepository.update(feeRequest.id, feeRequest);
    notifyState(stateCallbackUrl, feeRequest);
    throw e;
  }
  feeRequest.state = "SUCCESS";
  await platformFeeRequestRepository.update(feeRequest.id, feeRequest);
  notifyState(stateCallbackUrl, feeRequest);
}

const platformFeeService = { chargePlatformFee };

export default platformFeeService;
