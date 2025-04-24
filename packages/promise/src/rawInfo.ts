import { XPromiseStateEnum } from "./utils";

export type XPromiseExecutor<T> = (
  resolve: (value: T) => void,
  reject: (reason: any) => void,
) => void;

/** 下标 */
let index = 0;

/** 原始引用信息 */
export interface XPromiseRawRefInfo<T> {
  /** promise */
  promise: Promise<T>;
  /** resolve包装方法 */
  resolveWrap: (value: T) => void;
  /** reject包装方法 */
  rejectWrap: (reason: any) => void;
}

export interface XPromiseRecordInfo {
  /** 超时定时器 */
  timeoutTimer?: ReturnType<typeof setTimeout>;
  /** 清除超时定时器 */
  clearTimeoutTimer: () => void;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 状态 */
  state: XPromiseStateEnum;
  /** 数量 */
  num: number;
  /** 索引 */
  index: number;
}

/** base信息 */
export interface XPromiseBaseInfo<T>
  extends XPromiseRawRefInfo<T>,
    XPromiseRecordInfo {}

export interface XPromiseRawContext<T> {
  baseInfo: XPromiseBaseInfo<T>;
}

/** 挂载信息 */
const generateExecutor = <T>(
  executorRaw: XPromiseExecutor<T>,
  baseInfo: XPromiseRecordInfo & Partial<XPromiseRawRefInfo<T>>,
): XPromiseExecutor<T> => {
  return (resolve, reject) => {
    baseInfo.resolveWrap = (value: T) => {
      if (baseInfo.state !== XPromiseStateEnum.PENDING) {
        console.log(`当前状态已经变为${baseInfo.state}, 忽略resolve`);
        return;
      }
      baseInfo.endTime = Date.now();
      console.log(
        `${baseInfo.index} 调用成功${baseInfo.num++}次`,
        value,
        `耗时${baseInfo.endTime - baseInfo.startTime}ms`,
      );
      baseInfo.state = XPromiseStateEnum.FULFILLED;
      baseInfo.clearTimeoutTimer();
      resolve(value);
    };
    baseInfo.rejectWrap = (reason: any) => {
      if (baseInfo.state !== XPromiseStateEnum.PENDING) {
        console.log(`当前状态已经变为${baseInfo.state}, 忽略reject`);
        return;
      }
      baseInfo.endTime = Date.now();
      console.log(
        `${baseInfo.index} 调用失败${baseInfo.num++}次`,
        reason,
        `耗时${baseInfo.endTime - baseInfo.startTime}ms`,
      );
      baseInfo.state = XPromiseStateEnum.REJECTED;
      baseInfo.clearTimeoutTimer();
      reject(reason);
    };
    executorRaw(baseInfo.resolveWrap!, baseInfo.rejectWrap!);
  };
};

/** 创建 XPromiseRawInfo */
export const createXPromiseRawContext = <T>(
  executorRaw: XPromiseExecutor<T>,
): XPromiseRawContext<T> => {
  const baseInfo: XPromiseRecordInfo & Partial<XPromiseRawRefInfo<T>> = {
    timeoutTimer: undefined,
    clearTimeoutTimer() {
      if (this.timeoutTimer) {
        clearTimeout(this.timeoutTimer);
        this.timeoutTimer = undefined;
      }
    },
    startTime: Date.now(),
    state: XPromiseStateEnum.PENDING,
    num: 0,
    index: index++,
  };

  const executor = generateExecutor(executorRaw, baseInfo);

  baseInfo.promise = new Promise(executor);

  baseInfo.promise.catch((reason) => {
    if (baseInfo.state === XPromiseStateEnum.PENDING) {
      console.log(`promise 内部出现pending状态错误`, reason);
      baseInfo.rejectWrap?.(reason);
    }
    return reason;
  });

  return {
    baseInfo: baseInfo as XPromiseBaseInfo<T>,
  };
};
