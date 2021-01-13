import {
  Literal,
  Number as RTNumber,
  Record,
  Static,
  String,
  Undefined,
  Union,
} from "runtypes";
import BaseRepository from "./base.repository";

export const FeeRuleRoute = Record({
  unit: Union(Literal("percent"), Literal("flat")),
  amount: RTNumber,
  currency: String,
});

export const FeeRule = Record({
  name: String,
  description: String.Or(Undefined),
  routes: FeeRuleRoute,
});

export type FeeRuleT = Static<typeof FeeRule>;

class FeeRuleRepository extends BaseRepository<FeeRuleT> {}

const feeRuleRepository = new FeeRuleRepository("rule_");

export default feeRuleRepository;
