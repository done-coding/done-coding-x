import { XPromiseErrorCodeEnum } from "./enums";

/** 错误码映射表 */
export const XPromiseErrorCodeEnumMap: {
  [key in XPromiseErrorCodeEnum]: string;
} = {
  [XPromiseErrorCodeEnum.TIMEOUT]: "超时",
  [XPromiseErrorCodeEnum.ABORT]: "中止",
};
