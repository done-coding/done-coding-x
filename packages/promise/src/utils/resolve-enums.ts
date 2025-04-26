import { XPromiseErrorCodeEnum } from "./enums";

/** 错误码映射表 */
export const XPromiseErrorCodeEnumMap: {
  [key in XPromiseErrorCodeEnum]: string;
} = {
  [XPromiseErrorCodeEnum.CREATE_PROMISE_FAILED]: "创建Promise失败",
  [XPromiseErrorCodeEnum.TIMEOUT]: "超时",
  [XPromiseErrorCodeEnum.MAX_RETRY_FAILED]: "最大重试次数失败",
  [XPromiseErrorCodeEnum.ABORT]: "中止",
};
