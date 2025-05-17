import { XPromiseError } from "@/error";
import {
  catchFnExecError,
  XPromiseErrorCodeEnum,
  XPromiseStateEnum,
} from "@/utils";
import { ensureCreatePromiseFlowNormal } from "@/utils";
import { usePromiseSharing } from "./sharing";

/** promise 重试错误选项 */
export interface XPromiseRetryErrorOptions {
  /** 重试次数 */
  retryCount: number;
  /** 运行时间 */
  runTime: number;
  /** 错误信息列表 */
  errorMessageList: string[];
  /** 错误码 */
  code:
    | XPromiseErrorCodeEnum.ABORT
    | XPromiseErrorCodeEnum.RETRY_EXCEED_LIMIT
    | XPromiseErrorCodeEnum.RETRY_CAN_RETRY_FN_FAILED
    | XPromiseErrorCodeEnum.RETRY_DELAY_FN_FAILED;
  /** 错误消息 */
  message?: string;
}

/** promise 重试错误 */
export class XPromiseRetryError extends XPromiseError {
  /** 创建重试错误 */
  public static create(options: XPromiseRetryErrorOptions) {
    return new XPromiseRetryError(options);
  }

  /** 重试次数 */
  public readonly retryCount: number;
  /** 运行时间 */
  public readonly runTime: number;
  /** 错误列表 */
  public readonly errorMessageList: string[];

  public constructor(options: XPromiseRetryErrorOptions) {
    super(
      options.code,
      options.message ||
        `包括首次执行, 总共执行${options.retryCount + 1}次, 总共运行耗时${
          options.runTime
        }ms, 最终仍失败`,
    );

    this.retryCount = options.retryCount;
    this.runTime = options.runTime;
    this.errorMessageList = options.errorMessageList;
  }
}

/** 当前重试信息 */
export interface XPromiseCurrentRetryInfo {
  /** 重试次数 */
  retryCount: number;
  /** 运行时间 */
  runTime: number;
}

/** promise 重试选项 */
export interface XPromiseRetryOptions {
  /** 最大重试次数
   * @default 0 默认不重试，即只执行一次
   */
  maxRetry?: number;
  /**
   * 最大运行时间
   * @default Infinity 默认不限制
   */
  maxRunTime?: number;
  /** 最大错误消息列表长度
   * @default 10
   * @minimum 1
   */
  maxErrorMessageListLength?: number;
  /** 是否还可以重试 */
  canRetry?: (
    /** 当前重试信息 */
    currentRetryInfo: XPromiseCurrentRetryInfo,
    /** 错误 */
    err?: any,
  ) => boolean;
  /** 延迟时间 */
  delay?:
    | ((
        /** 当前重试信息 */
        currentRetryInfo: XPromiseCurrentRetryInfo,
        /** 错误 */
        err?: any,
      ) => number)
    | number;
}

export const usePromiseRetry = <T>(
  createPromise: (
    /** 当前重试次数 */
    retryCount: number,
    /** 错误 */
    err?: any,
  ) => Promise<T>,
  {
    maxRetry = 0,
    maxRunTime = Infinity,
    maxErrorMessageListLength = 10,
    canRetry = ({ retryCount, runTime }) => {
      return retryCount < Math.max(maxRetry, 0) && runTime < maxRunTime;
    },
    delay = 0,
  }: XPromiseRetryOptions,
) => {
  // 确保最大错误消息列表长度至少为1
  const finalMaxErrorMessageListLength = Math.max(maxErrorMessageListLength, 1);

  /** 获取延迟时间 */
  const getDelay = typeof delay === "function" ? delay : () => delay;

  /** 是否停止重试 */
  let isStop = false;

  /** 清除重试 */
  let clearRetry: (() => void) | undefined;

  /** 重试方法 */
  const retryFn = () => {
    let retryCount = 0;

    let startTime = Date.now();

    /** 错误信息列表 */
    const errorMessageList: string[] = [];

    const promise = new Promise<T>((resolve, reject) => {
      const attempt = () => {
        ensureCreatePromiseFlowNormal(() => createPromise(retryCount))
          .then(resolve)
          .catch((error) => {
            errorMessageList.push(error?.message || "未知错误");

            const currentErrorMessageLength = errorMessageList.length;
            /** 超出长度 */
            const exceedLength = Math.max(
              currentErrorMessageLength - finalMaxErrorMessageListLength,
              0,
            );

            if (exceedLength > 0) {
              // 超出 则删除超出部分
              errorMessageList.splice(
                currentErrorMessageLength - exceedLength,
                exceedLength,
              );
            }

            const endTime = Date.now();
            const runTime = endTime - startTime;

            const retry = catchFnExecError(
              () => canRetry({ retryCount, runTime }, error),
              (canRetryExecErr) => {
                const canRetryExecErrFinal = XPromiseRetryError.create({
                  retryCount,
                  runTime,
                  errorMessageList,
                  code: XPromiseErrorCodeEnum.RETRY_CAN_RETRY_FN_FAILED,
                  message: canRetryExecErr?.message || undefined,
                });
                reject(canRetryExecErrFinal);
                throw canRetryExecErrFinal;
              },
            );

            if (retry) {
              if (isStop) {
                return reject(
                  XPromiseRetryError.create({
                    retryCount,
                    runTime,
                    errorMessageList,
                    code: XPromiseErrorCodeEnum.ABORT,
                  }),
                );
              }

              const delay = catchFnExecError(
                () => getDelay({ retryCount, runTime }, error),
                (delayExecErr) => {
                  const delayExecErrFinal = XPromiseRetryError.create({
                    retryCount,
                    runTime,
                    errorMessageList,
                    code: XPromiseErrorCodeEnum.RETRY_DELAY_FN_FAILED,
                    message: delayExecErr?.message || undefined,
                  });
                  reject(delayExecErrFinal);
                  throw delayExecErrFinal;
                },
              );

              if (delay > 0) {
                retryCount++;
                const timer = setTimeout(attempt, delay);

                /** 清除重试 */
                clearRetry = () => {
                  clearTimeout(timer);
                  reject(
                    XPromiseRetryError.create({
                      retryCount,
                      runTime,
                      errorMessageList,
                      code: XPromiseErrorCodeEnum.ABORT,
                    }),
                  );
                };
              } else {
                retryCount++;
                attempt();
              }
            } else {
              reject(
                XPromiseRetryError.create({
                  retryCount,
                  runTime,
                  errorMessageList,
                  code: XPromiseErrorCodeEnum.RETRY_EXCEED_LIMIT,
                }),
              );
            }
          })
          .finally(() => {
            clearRetry = undefined;
          });
      };

      attempt();
    });

    promise.finally(() => {
      isStop = false;
    });

    return promise;
  };

  const { getStatus, applyPromise, getCurrentPromise } = usePromiseSharing(
    retryFn,
    {
      rejectClean: true,
      resolveClean: true,
    },
  );

  /** 重试中 */
  const isRetrying = () => {
    return getStatus() === XPromiseStateEnum.PENDING;
  };

  /** 开始重试 */
  const startRetry = () => {
    return applyPromise();
  };

  /** 停止重试 */
  const stopRetry = () => {
    isStop = true;
    clearRetry?.();

    return getCurrentPromise();
  };

  return {
    /** 开始重试 */
    startRetry,
    /** 停止重试 */
    stopRetry,
    /** 获取重试状态 */
    getStatus,
    /** 判断是在重试中 */
    isRetrying,
  };
};
