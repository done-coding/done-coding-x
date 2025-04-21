import { XPromiseError } from "./error";
import { XPromiseStateEnum } from "./utils";
import { XPromiseErrorCodeEnum } from "./utils";

export { XPromiseError, XPromiseErrorCodeEnum };

/** shim信息 */
export interface XPromiseShimInfo<T> {
  /** 超时定时器 */
  timeoutTimer?: number;
  /** resolve原始方法 */
  resolveRaw?: (value: T) => void;
  /** reject原始方法 */
  rejectRaw?: (reason: any) => void;
  /** resolve包装方法 */
  resolveWrap: (value: T) => void;
  /** reject包装方法 */
  rejectWrap: (reason: any) => void;
  /** 清除超时定时器 */
  clearTimeoutTimer: () => void;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 状态 */
  state: XPromiseStateEnum;
}

/** promise拓展 */
export class XPromise<T> extends Promise<T> {
  private __SHIM_INFO__: XPromiseShimInfo<T>;

  public constructor(
    executor: (
      resolve: (value: T) => void,
      reject: (reason: any) => void,
    ) => void,
  ) {
    const shimInfo: XPromiseShimInfo<T> = {
      resolveRaw() {},
      rejectRaw() {},
      resolveWrap() {},
      rejectWrap() {},
      timeoutTimer: undefined,
      clearTimeoutTimer() {
        if (this.timeoutTimer) {
          clearTimeout(this.timeoutTimer);
          this.timeoutTimer = undefined;
        }
      },
      startTime: Date.now(),
      state: XPromiseStateEnum.PENDING,
    };
    super((res, rej) => {
      shimInfo.resolveRaw = res;
      shimInfo.rejectRaw = rej;

      const resWrap = (value: T) => {
        if (shimInfo.state !== XPromiseStateEnum.PENDING) {
          console.log(`当前状态已经变为${shimInfo.state}, 忽略resolve`);
          return;
        }
        shimInfo.endTime = Date.now();
        console.log(
          "成功",
          value,
          `耗时${shimInfo.endTime - shimInfo.startTime}ms`,
        );
        shimInfo.state = XPromiseStateEnum.FULFILLED;
        shimInfo.clearTimeoutTimer();
        shimInfo.resolveRaw?.(value);
        shimInfo.resolveRaw = undefined;
      };
      const rejWrap = (reason: any) => {
        if (shimInfo.state !== XPromiseStateEnum.PENDING) {
          console.log(`当前状态已经变为${shimInfo.state}, 忽略reject`);
          return;
        }
        shimInfo.endTime = Date.now();
        console.log(
          "失败",
          reason,
          `耗时${shimInfo.endTime - shimInfo.startTime}ms`,
        );
        shimInfo.state = XPromiseStateEnum.REJECTED;
        shimInfo.clearTimeoutTimer();
        shimInfo.rejectRaw?.(reason);
        shimInfo.rejectRaw = undefined;
      };
      shimInfo.resolveWrap = resWrap;
      shimInfo.rejectWrap = rejWrap;
      executor(resWrap, rejWrap);
    });

    this.__SHIM_INFO__ = shimInfo;
    this.init();
  }

  /** 超时设置 */
  public timeout = (time: number): XPromise<T> => {
    if (this.__SHIM_INFO__.state !== XPromiseStateEnum.PENDING) {
      console.warn("超时设置失败，promise状态不为pending");
      return this;
    }
    this.__SHIM_INFO__.clearTimeoutTimer();
    const endTime = this.__SHIM_INFO__.startTime + time;
    const waitTime = Math.max(0, endTime - Date.now());

    console.log(`超时设置${time}ms, 剩余${waitTime}ms`);
    this.__SHIM_INFO__.timeoutTimer = setTimeout(() => {
      console.log("走到超时时刻");
      this.__SHIM_INFO__.rejectWrap(
        new XPromiseError(XPromiseErrorCodeEnum.TIMEOUT),
      );
    }, waitTime) as unknown as number;
    return this;
  };

  private init() {
    this.catch((reason) => {
      if (this.__SHIM_INFO__.state !== XPromiseStateEnum.PENDING) {
        return;
      }
      this.__SHIM_INFO__.rejectWrap(reason);
      throw reason;
    });
  }
}
