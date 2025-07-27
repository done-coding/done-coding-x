import { XPromiseStateEnum } from "@/utils";
import type { XPromiseCurrentRetryInfo } from "./retry";
import { usePromiseRetry, XPromiseRetryError } from "./retry";

/** 当前轮询信息 */
export interface XPromiseCurrentPollingInfo {
  /** 轮询次数 */
  pollingCount: number;
  /** 运行时间 */
  runTime: number;
}

/** promise 轮询选项 */
export interface XPromisePollingOptions {
  /** 最大轮询次数
   * 需要设置>1 否则会当作1处理
   * @default Infinity 默认不限制
   */
  maxPollingCount?: number;
  /**
   * 最大运行时间
   * @default Infinity 默认不限制
   */
  maxRunTime?: number;
  /** 是否还可以轮询 */
  canPolling?: (
    /** 当前轮询信息 */
    currentPollingInfo: XPromiseCurrentPollingInfo,
    /** 错误 */
    err?: any,
  ) => boolean;
  /**
   * 延迟时间
   * @default 300 默认延迟 300ms
   */
  delay?:
    | ((
        /** 当前轮询信息 */
        currentRetryInfo: XPromiseCurrentPollingInfo,
        /** 错误 */
        err?: any,
      ) => number)
    | number;
}

/** promise 轮询 */
export const usePromisePolling = (
  createPromise: (
    /** 当前轮询次数 */
    pollingCount: number,
    /** 错误 */
    err?: any,
  ) => Promise<any>,
  {
    maxPollingCount = Infinity,
    maxRunTime = Infinity,
    canPolling = ({ pollingCount, runTime }) => {
      return (
        pollingCount < Math.max(maxPollingCount, 1) && runTime < maxRunTime
      );
    },
    delay = 300,
  }: XPromisePollingOptions,
) => {
  const {
    startRetry,
    stopRetry: stopPolling,
    getStatus,
    isRetrying: isPolling,
  } = usePromiseRetry(
    async (retryCount: number, err?: any): Promise<void> => {
      try {
        await createPromise(retryCount + 1, err);
      } catch (error) {
        // 不需要处理
      }
      // 无论成功还是失败 都需要抛错触发下次轮询
      throw new Error("触发下次轮询");
    },
    {
      maxRetry: maxPollingCount - 1,
      maxRunTime,
      maxErrorMessageListLength: 1,
      canRetry: ({ retryCount, runTime }, err) => {
        return canPolling({ pollingCount: retryCount + 1, runTime }, err);
      },
      delay: (currentRetryInfo: XPromiseCurrentRetryInfo, err?: any) => {
        return typeof delay === "function"
          ? delay(
              {
                pollingCount: currentRetryInfo.retryCount + 1,
                runTime: currentRetryInfo.runTime,
              },
              err,
            )
          : delay;
      },
    },
  );

  return {
    /** 开始轮询 */
    startPolling: async () => {
      try {
        await startRetry();
        return;
      } catch (error) {
        // 轮询只要没有达到限制条件 每次失败成功无所谓
        // 为了复用重试机制 会将createPromise包装一层 每次都是失败
        if (error instanceof XPromiseRetryError) {
          return error;
        }
        await Promise.resolve();
        return;
      }
    },
    /** 停止轮询 */
    stopPolling,
    /**
     * 获取轮询状态
     * ---
     * 只有pending状态才是轮询中, 没有失败或成功状态 未开始和轮询结束都是 未开始轮询
     */
    getStatus: () => {
      const status = getStatus();
      if (status === XPromiseStateEnum.PENDING) {
        return XPromiseStateEnum.PENDING;
      } else {
        return XPromiseStateEnum.NOT_STARTED;
      }
    },
    /** 判断是在轮询中 */
    isPolling,
  };
};
