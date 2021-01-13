import platformService from "./platform.service";
import transactionService from "./transaction.service";
import platformFeeRequestRepository, {
  PlatformFeeRequestT,
  PlatformFeeT,
} from "../repositories/platform-fee-request.repository";
import feeRuleRepository, {
  FeeRuleT,
} from "../repositories/fee-rule.repository";
import { mocked } from "ts-jest/utils";
import platformFeeService from "./platform-fee.service";
import axios from "axios";
import _ from "lodash";
import { BadRequestError, TransactionServiceError } from "../errors";

jest.mock("./platform.service");
jest.mock("./transaction.service");
jest.mock("../repositories/platform-fee-request.repository");
jest.mock("../repositories/fee-rule.repository");
jest.mock("axios");
jest.mock("../utils/logger"); // logging turned off because it's hella noisy

const mockedPlatformFeeRequestRepository = mocked(
  platformFeeRequestRepository,
  true
);
const mockedFeeRuleRepository = mocked(feeRuleRepository, true);
const mockedPlatformService = mocked(platformService, true);
const mockedTransactionService = mocked(transactionService, true);
const mockedAxios = mocked(axios);

const PLATFORM_USER_ID = "sampleUserId";
const PLATFORM_FEE_CALLBACK_URL = "https://foo.fighters";
const DEFAULT_TS = "2021-01-13T04:20:31.398Z";

const DEFAULT_PLATFORM_FEE: PlatformFeeT = {
  ruleId: "rule_foo",
  forUserId: "123",
  blockedTransactionId: "transaction_4312",
  invoiceId: "1234",
  paidAmount: 1000,
  paidCurrency: "IDR",
};

describe("platform-fee.service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedPlatformService.getPlatformConfig.mockResolvedValue({
      id: PLATFORM_USER_ID,
      fee_charge_state_callback_url: PLATFORM_FEE_CALLBACK_URL,
    });
    mockedPlatformFeeRequestRepository.create.mockImplementation(
      async (fee) => {
        return {
          ...fee,
          id: "fee_foo",
          created: DEFAULT_TS,
          updated: DEFAULT_TS,
        };
      }
    );
  });

  test("should successfully charge platform fee with flat fee", async () => {
    mockedFeeRuleRepository.read.mockImplementation(async (ruleId) => {
      return ruleId === "rule_foo"
        ? {
            name: "Foo",
            description: "Default Platform Fee",
            routes: {
              amount: 1234,
              currency: "IDR",
              unit: "flat",
            },
            id: ruleId,
            created: DEFAULT_TS,
            updated: DEFAULT_TS,
          }
        : undefined;
    });
    const expectedFeeRequest: PlatformFeeRequestT = {
      ...DEFAULT_PLATFORM_FEE,
      state: "PENDING",
      extraInfo: undefined,
      calculatedFee: {
        currency: "IDR",
        amount: 1234,
      },
    };
    await platformFeeService.chargePlatformFee(
      DEFAULT_PLATFORM_FEE,
      PLATFORM_USER_ID
    );
    expect(mockedPlatformFeeRequestRepository.create).toHaveBeenCalledTimes(1);
    expect(mockedPlatformFeeRequestRepository.create.mock.calls[0][0]).toEqual(
      expectedFeeRequest
    );
    expect(mockedTransactionService.debitAccount).toHaveBeenCalledTimes(1);
    expect(mockedTransactionService.debitAccount).toHaveBeenCalledWith({
      fromUserId: DEFAULT_PLATFORM_FEE.forUserId,
      toUserId: PLATFORM_USER_ID,
      amount: 1234,
      currency: "IDR",
    });
    expect(
      mockedTransactionService.removePendingFlagFromTransaction
    ).toHaveBeenCalledTimes(1);
    expect(
      mockedTransactionService.removePendingFlagFromTransaction
    ).toHaveBeenCalledWith(DEFAULT_PLATFORM_FEE.blockedTransactionId);
    const expectedFeeRequestData = {
      ...expectedFeeRequest,
      state: "SUCCESS",
      id: "fee_foo",
      created: DEFAULT_TS,
      updated: DEFAULT_TS,
    };
    expect(mockedPlatformFeeRequestRepository.update).toHaveBeenCalledWith(
      "fee_foo",
      expectedFeeRequestData
    );
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      PLATFORM_FEE_CALLBACK_URL,
      expectedFeeRequestData
    );
    expect(mockedAxios.post).toHaveBeenCalledWith(
      PLATFORM_FEE_CALLBACK_URL,
      expectedFeeRequestData
    );
  });

  test("should successfully charge platform fee with percent fee", async () => {
    mockedFeeRuleRepository.read.mockImplementation(async (ruleId) => {
      return ruleId === "rule_foo"
        ? {
            name: "Foo",
            description: "Default Platform Fee",
            routes: {
              amount: 50,
              currency: "IDR",
              unit: "percent",
            },
            id: ruleId,
            created: DEFAULT_TS,
            updated: DEFAULT_TS,
          }
        : undefined;
    });
    const expectedFeeRequest: PlatformFeeRequestT = {
      ...DEFAULT_PLATFORM_FEE,
      state: "PENDING",
      extraInfo: undefined,
      calculatedFee: {
        currency: "IDR",
        amount: 500,
      },
    };
    await platformFeeService.chargePlatformFee(
      DEFAULT_PLATFORM_FEE,
      PLATFORM_USER_ID
    );
    expect(mockedPlatformFeeRequestRepository.create).toHaveBeenCalledTimes(1);
    expect(mockedPlatformFeeRequestRepository.create.mock.calls[0][0]).toEqual(
      expectedFeeRequest
    );
    expect(mockedTransactionService.debitAccount).toHaveBeenCalledTimes(1);
    expect(mockedTransactionService.debitAccount).toHaveBeenCalledWith({
      fromUserId: DEFAULT_PLATFORM_FEE.forUserId,
      toUserId: PLATFORM_USER_ID,
      amount: 500,
      currency: "IDR",
    });
    expect(
      mockedTransactionService.removePendingFlagFromTransaction
    ).toHaveBeenCalledTimes(1);
    expect(
      mockedTransactionService.removePendingFlagFromTransaction
    ).toHaveBeenCalledWith(DEFAULT_PLATFORM_FEE.blockedTransactionId);
    const expectedFeeRequestData = {
      ...expectedFeeRequest,
      state: "SUCCESS",
      id: "fee_foo",
      created: DEFAULT_TS,
      updated: DEFAULT_TS,
    };
    expect(mockedPlatformFeeRequestRepository.update).toHaveBeenCalledWith(
      "fee_foo",
      expectedFeeRequestData
    );
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      PLATFORM_FEE_CALLBACK_URL,
      expectedFeeRequestData
    );
  });

  test("should fail to create new platform fee request when fee rule is invalid", async () => {
    mockedFeeRuleRepository.read.mockImplementation(async (ruleId) => {
      return ruleId === "rule_foo"
        ? {
            name: "Foo",
            description: "Default Platform Fee",
            routes: {
              amount: 1234,
              currency: "IDR",
              unit: "flat",
            },
            id: ruleId,
            created: DEFAULT_TS,
            updated: DEFAULT_TS,
          }
        : undefined;
    });
    const platformFee: PlatformFeeT = {
      ruleId: "INVALID_RULE_HERE",
      forUserId: "123",
      blockedTransactionId: "transaction_4312",
      paidAmount: 1000,
      paidCurrency: "IDR",
      invoiceId: "invoice_foo",
    };
    expect(
      platformFeeService.chargePlatformFee(platformFee, PLATFORM_USER_ID)
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  test("should fail to create new platform fee request when fee rule currency does not match payment currency", async () => {
    mockedFeeRuleRepository.read.mockImplementation(async (ruleId) => {
      return ruleId === "rule_foo"
        ? {
            name: "Foo",
            description: "Default Platform Fee",
            routes: {
              amount: 1234,
              currency: "IDR",
              unit: "flat",
            },
            id: ruleId,
            created: DEFAULT_TS,
            updated: DEFAULT_TS,
          }
        : undefined;
    });
    expect(
      platformFeeService.chargePlatformFee(
        DEFAULT_PLATFORM_FEE,
        PLATFORM_USER_ID
      )
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  test("should fail to complete new payment fee when account cannot be debited", async () => {
    mockedFeeRuleRepository.read.mockImplementation(async (ruleId) => {
      return ruleId === "rule_foo"
        ? {
            name: "Foo",
            description: "Default Platform Fee",
            routes: {
              amount: 1234,
              currency: "IDR",
              unit: "flat",
            },
            id: ruleId,
            created: DEFAULT_TS,
            updated: DEFAULT_TS,
          }
        : undefined;
    });
    mockedPlatformFeeRequestRepository.create.mockImplementation(
      async (fee) => {
        return {
          ...fee,
          id: "fee_foo",
          created: DEFAULT_TS,
          updated: DEFAULT_TS,
        };
      }
    );
    const expectedFeeRequest: PlatformFeeRequestT = {
      ...DEFAULT_PLATFORM_FEE,
      state: "PENDING",
      extraInfo: undefined,
      calculatedFee: {
        currency: "IDR",
        amount: 1234,
      },
    };
    const err = new TransactionServiceError(
      "Cannot seem to do something here..."
    );
    mockedTransactionService.debitAccount.mockRejectedValue(err);
    try {
      await platformFeeService.chargePlatformFee(
        DEFAULT_PLATFORM_FEE,
        PLATFORM_USER_ID
      );
      fail("Call did not throw an error.");
    } catch (e) {
      expect(mockedPlatformFeeRequestRepository.create).toHaveBeenCalledTimes(
        1
      );
      expect(
        mockedPlatformFeeRequestRepository.create.mock.calls[0][0]
      ).toEqual(expectedFeeRequest);
      expect(mockedTransactionService.debitAccount).toHaveBeenCalledTimes(1);
      expect(mockedTransactionService.debitAccount).toHaveBeenCalledWith({
        fromUserId: DEFAULT_PLATFORM_FEE.forUserId,
        toUserId: PLATFORM_USER_ID,
        amount: 1234,
        currency: "IDR",
      });
      expect(
        mockedTransactionService.removePendingFlagFromTransaction
      ).toHaveBeenCalledTimes(0);
      expect(mockedPlatformFeeRequestRepository.update).toHaveBeenCalledWith(
        "fee_foo",
        {
          ...expectedFeeRequest,
          extraInfo: `Fee charge failed. Reason: ${err.message}`,
          state: "ERROR",
          id: "fee_foo",
          created: DEFAULT_TS,
          updated: DEFAULT_TS,
        }
      );
    }
  });

  test("should fail to complete new payment fee when transaction lock cannot be lifted", async () => {
    mockedFeeRuleRepository.read.mockImplementation(async (ruleId) => {
      return ruleId === "rule_foo"
        ? {
            name: "Foo",
            description: "Default Platform Fee",
            routes: {
              amount: 1234,
              currency: "IDR",
              unit: "flat",
            },
            id: ruleId,
            created: DEFAULT_TS,
            updated: DEFAULT_TS,
          }
        : undefined;
    });
    const expectedFeeRequest: PlatformFeeRequestT = {
      ...DEFAULT_PLATFORM_FEE,
      state: "PENDING",
      extraInfo: undefined,
      calculatedFee: {
        currency: "IDR",
        amount: 1234,
      },
    };
    mockedTransactionService.removePendingFlagFromTransaction.mockRejectedValue(
      new TransactionServiceError("Cannot remove pending flag.")
    );
    try {
      await platformFeeService.chargePlatformFee(
        DEFAULT_PLATFORM_FEE,
        PLATFORM_USER_ID
      );
      fail("Call did not throw an error.");
    } catch (e) {
      expect(mockedPlatformFeeRequestRepository.create).toHaveBeenCalledTimes(
        1
      );
      expect(
        mockedPlatformFeeRequestRepository.create.mock.calls[0][0]
      ).toEqual(expectedFeeRequest);
      expect(
        mockedTransactionService.removePendingFlagFromTransaction
      ).toHaveBeenCalledTimes(1);
      expect(mockedPlatformFeeRequestRepository.update).toHaveBeenCalledWith(
        "fee_foo",
        {
          ...expectedFeeRequest,
          extraInfo: "Fee charge failed. Reason: Cannot remove pending flag.",
          state: "ERROR",
          id: "fee_foo",
          created: DEFAULT_TS,
          updated: DEFAULT_TS,
        }
      );
    }
  });

  test("should fail to complete new payment fee when an unknown error occurs in transactionService", async () => {
    mockedFeeRuleRepository.read.mockImplementation(async (ruleId) => {
      return ruleId === "rule_foo"
        ? {
            name: "Foo",
            description: "Default Platform Fee",
            routes: {
              amount: 1234,
              currency: "IDR",
              unit: "flat",
            },
            id: ruleId,
            created: DEFAULT_TS,
            updated: DEFAULT_TS,
          }
        : undefined;
    });
    const expectedFeeRequest: PlatformFeeRequestT = {
      ...DEFAULT_PLATFORM_FEE,
      state: "PENDING",
      extraInfo: undefined,
      calculatedFee: {
        currency: "IDR",
        amount: 1234,
      },
    };
    mockedTransactionService.removePendingFlagFromTransaction.mockRejectedValue(
      new Error("Why hello stranger")
    );
    try {
      await platformFeeService.chargePlatformFee(
        DEFAULT_PLATFORM_FEE,
        PLATFORM_USER_ID
      );
      fail("Call did not throw an error.");
    } catch (e) {
      expect(mockedPlatformFeeRequestRepository.create).toHaveBeenCalledTimes(
        1
      );
      expect(
        mockedPlatformFeeRequestRepository.create.mock.calls[0][0]
      ).toEqual(expectedFeeRequest);
      expect(
        mockedTransactionService.removePendingFlagFromTransaction
      ).toHaveBeenCalledTimes(1);
      expect(mockedPlatformFeeRequestRepository.update).toHaveBeenCalledWith(
        "fee_foo",
        {
          ...expectedFeeRequest,
          extraInfo:
            "Fee charge failed. Unknown exception occurred - please get in touch with support.",
          state: "ERROR",
          id: "fee_foo",
          created: DEFAULT_TS,
          updated: DEFAULT_TS,
        }
      );
    }
  });
});
