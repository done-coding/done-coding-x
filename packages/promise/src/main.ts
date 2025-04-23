import { XPromiseError } from "./error";
import type { XPromiseExecutor, XPromiseRawContext } from "./rawInfo";
import { createXPromiseRawContext } from "./rawInfo";
import { XPromiseStateEnum } from "./utils";
import { XPromiseErrorCodeEnum } from "./utils";

export { XPromiseError, XPromiseErrorCodeEnum };

/** promise拓展 */
export class XPromise<T> implements Promise<T> {
  private __RAW_CONTEXT__: XPromiseRawContext<T>;

  public constructor(executorRaw: XPromiseExecutor<T>) {
    this.__RAW_CONTEXT__ = createXPromiseRawContext(executorRaw);
  }

  public get then() {
    return this.__RAW_CONTEXT__.baseInfo.promiseThen;
  }

  public get catch() {
    return this.__RAW_CONTEXT__.baseInfo.promiseCatch;
  }

  public get finally() {
    return this.__RAW_CONTEXT__.baseInfo.promiseFinally;
  }

  public get [Symbol.toStringTag]() {
    return this.__RAW_CONTEXT__.baseInfo.promise![Symbol.toStringTag];
  }

  /** 超时设置 */
  public timeout = (time: number): XPromise<T> => {
    const { baseInfo } = this.__RAW_CONTEXT__;
    if (baseInfo.state !== XPromiseStateEnum.PENDING) {
      console.warn("超时设置失败，promise状态不为pending");
      return this;
    }
    baseInfo.clearTimeoutTimer();
    const waitTime = Math.max(0, baseInfo.startTime + time - Date.now());

    console.log(`超时设置${time}ms, 剩余${waitTime}ms`);
    baseInfo.timeoutTimer = setTimeout(() => {
      console.log("走到超时时刻");
      baseInfo.rejectWrap(new XPromiseError(XPromiseErrorCodeEnum.TIMEOUT));
    }, waitTime) as unknown as number;
    return this;
  };
}
