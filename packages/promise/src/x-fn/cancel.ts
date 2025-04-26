import { XPromiseError } from "@/error";
import { XPromiseErrorCodeEnum, XPromiseErrorCodeEnumMap } from "@/utils";

/** promise 取消错误 */
export class XPromiseCancelError extends XPromiseError {
  public constructor(
    message = XPromiseErrorCodeEnumMap[XPromiseErrorCodeEnum.ABORT],
  ) {
    super(XPromiseErrorCodeEnum.ABORT, message);
  }
}

/** 取消令牌 中止具体操作 */
export type XPromiseCancelTokenAbortFn = (message?: string) => void;

/** 取消令牌 reject 函数 */
export class XPromiseCancelToken {
  /** 是否取消错误 */
  public static isCancelError = (
    error: unknown,
  ): error is XPromiseCancelError => error instanceof XPromiseCancelError;

  /** 创建 promise 取消令牌 */
  public static source = (abortFn: XPromiseCancelTokenAbortFn) =>
    new XPromiseCancelToken(abortFn);
  /** promise原始reject函数 */
  #abortFn: XPromiseCancelTokenAbortFn;
  private constructor(abortFn: XPromiseCancelTokenAbortFn) {
    this.#abortFn = abortFn;
  }
  /** 取消 promise */
  public cancel(message?: string) {
    this.#abortFn(message);
  }
}
