import { XPromiseErrorCodeEnum } from "./enums";

/** 错误码映射表 */
export const XPromiseErrorCodeEnumMap: {
  [key in XPromiseErrorCodeEnum]: string;
} = {
  [XPromiseErrorCodeEnum.CREATE_PROMISE_FAILED]: "创建Promise失败",
  [XPromiseErrorCodeEnum.TIMEOUT]: "超时",
  [XPromiseErrorCodeEnum.ABORT]: "中止",
  [XPromiseErrorCodeEnum.RETRY_EXCEED_LIMIT]: "重试/轮询超出限制",
  [XPromiseErrorCodeEnum.RETRY_CAN_CONDITION_FN_FAILED]:
    "重试/轮询条件函数执行失败",
  [XPromiseErrorCodeEnum.RETRY_DELAY_FN_FAILED]: "重试/轮询延迟函数执行失败",
};
