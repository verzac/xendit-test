import {
  Literal,
  Number,
  Record,
  Static,
  String,
  Undefined,
  Union,
} from "runtypes";
import BaseRepository from "./base.repository";

export const PlatformFee = Record({
  ruleId: String,
  forUserId: String,
  blockedTransactionId: String.Or(Undefined),
  paidAmount: Number,
  paidCurrency: String,
  invoiceId: String,
});

export const PlatformFeeRequest = PlatformFee.And(
  Record({
    state: Union(Literal("PENDING"), Literal("SUCCESS"), Literal("ERROR")),
    extraInfo: String.Or(Undefined),
    calculatedFee: Record({
      amount: Number,
      currency: String,
    }),
  })
);

export type PlatformFeeT = Static<typeof PlatformFee>;

export type PlatformFeeRequestT = Static<typeof PlatformFeeRequest>;

class PlatformFeeRequestRepository extends BaseRepository<PlatformFeeRequestT> {}

const platformFeeRequestRepository = new PlatformFeeRequestRepository("fee_");

export default platformFeeRequestRepository;
