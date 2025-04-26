import { XPromiseError } from "./error";
import type { XPromiseExecutor, XPromiseRawContext } from "./rawInfo";
import { createXPromiseRawContext } from "./rawInfo";
import { XPromiseStateEnum } from "./utils";
import { XPromiseErrorCodeEnum } from "./utils";
import { promiseRetry, usePromiseSharing, XPromiseCancelError } from "./x-fn";
import { XPromiseCancelToken } from "./x-fn";

export { XPromiseError, XPromiseErrorCodeEnum };

/** promise拓展 */
export class XPromise<T> implements Promise<T> {
  /** promise共享 */
  public static useSharing = usePromiseSharing;
  /** promise重试 */
  public static retry = promiseRetry;

  public readonly [Symbol.toStringTag] = `object ${XPromise.name}`;

  /** 原始promise上下文 */
  #sourcePromiseContext: XPromiseRawContext<T>;

  public constructor(executorRaw: XPromiseExecutor<T>) {
    this.#sourcePromiseContext = createXPromiseRawContext(executorRaw);
  }

  // 修正 then 方法
  public then<TResult1 = T, TResult2 = never>(
    onFulfilled?: (value: T) => TResult1 | PromiseLike<TResult1>,
    onRejected?: (reason: any) => TResult2 | PromiseLike<TResult2>,
  ): XPromise<TResult1 | TResult2> {
    return new XPromise((resolve, reject) => {
      this.#sourcePromiseContext.baseInfo.promise
        .then(onFulfilled, onRejected)
        .then(resolve, reject);
    });
  }

  // 修正 catch 方法
  public catch<TResult = never>(
    onRejected?: (reason: any) => TResult | PromiseLike<TResult>,
  ): XPromise<T | TResult> {
    return this.then(undefined, onRejected);
  }

  // 修正 finally 方法
  public finally(onFinally?: () => void): XPromise<T> {
    return new XPromise((resolve, reject) => {
      this.#sourcePromiseContext.baseInfo.promise
        .finally(onFinally)
        .then(resolve, reject);
    });
  }

  /** 超时设置 */
  public timeout = (time: number): XPromise<T> => {
    const { baseInfo } = this.#sourcePromiseContext;
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
    }, waitTime);
    return this;
  };

  /** 中止promise */
  public abort = (message?: string) => {
    const { baseInfo } = this.#sourcePromiseContext;
    if (baseInfo.state !== XPromiseStateEnum.PENDING) {
      console.warn("取消失败，promise状态不为pending");
      return this;
    }
    const cancelToken = XPromiseCancelToken.source((message) => {
      baseInfo.rejectWrap(new XPromiseCancelError(message));
    });
    cancelToken.cancel(message);
    return this;
  };
}
