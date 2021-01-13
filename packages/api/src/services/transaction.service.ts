import axios from "axios";
import config from "../config";
import { TransactionServiceError } from "../errors";
import logger from "../utils/logger";

interface DebitRequest {
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
}

async function debitAccount(debitReq: DebitRequest): Promise<void> {
  await axios
    .post(`${config.url.transactionService}/debit`, debitReq)
    .catch((e) => {
      if (axios.isAxiosError(e)) {
        logger.error(`${e.code}: ${JSON.stringify(e.response?.data) || ""}`);
        throw new TransactionServiceError("Debit account failed.");
      } else {
        throw e;
      }
    });
}

async function removePendingFlagFromTransaction(
  transactionId: string
): Promise<void> {
  await axios
    .post(`${config.url.transactionService}/releaselock`, {
      transactionId,
    })
    .catch((e) => {
      if (axios.isAxiosError(e)) {
        logger.error(`${e.code}: ${JSON.stringify(e.response?.data) || ""}`);
        throw new TransactionServiceError(
          "Remove pending flag from transaction failed."
        );
      } else {
        throw e;
      }
    });
}

const transactionService = { debitAccount, removePendingFlagFromTransaction };

export default transactionService;
