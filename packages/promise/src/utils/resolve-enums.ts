import { XPromiseErrorCodeEnum } from "./enums";

/** 错误码映射表 */
export const XPromiseErrorCodeEnumMap: {
  [key in XPromiseErrorCodeEnum]: string;
} = {
  [XPromiseErrorCodeEnum.CREATE_PROMISE_FAILED]: "创建Promise失败",
  [XPromiseErrorCodeEnum.TIMEOUT]: "超时",
  [XPromiseErrorCodeEnum.ABORT]: "中止",
  [XPromiseErrorCodeEnum.RETRY_EXCEED_LIMIT]: "重试超出限制",
  [XPromiseErrorCodeEnum.RETRY_CAN_RETRY_FN_FAILED]:
    "重试判断是否可以重试函数执行失败",
  [XPromiseErrorCodeEnum.RETRY_DELAY_FN_FAILED]: "重试延迟函数执行失败",
};
