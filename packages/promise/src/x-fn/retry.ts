import { XPromiseError } from "@/error";
import { ensureCreatePromiseFlowNormal, XPromiseErrorCodeEnum } from "@/utils";

/** promise 重试错误 */
export class XPromiseRetryError extends XPromiseError {
  public constructor(
    public errorList: Error[],
    message = `执行${errorList.length}次(重试${
      errorList.length - 1
    }次)，最终仍失败`,
  ) {
    super(XPromiseErrorCodeEnum.MAX_RETRY_FAILED, message);
  }
}

/** promise 重试选项 */
export interface XPromiseRetryOptions {
  /** 最大重试次数 */
  maxRetry?: number;
  /** 是否还可以重试 */
  canRetry?: (
    /** 当前重试次数 */
    retryCount: number,
  ) => boolean;
  /** 延迟时间 */
  delay?:
    | ((
        /** 当前重试次数 */
        retryCount: number,
      ) => number)
    | number;
}

/** promise 重试 */
export const promiseRetry = <T>(
  createPromise: (
    /** 当前重试次数 */
    retryCount: number,
  ) => Promise<T>,
  {
    maxRetry = 0,
    canRetry = (retryCount) => {
      return retryCount < Math.max(maxRetry, 0);
    },
    delay = 0,
  }: XPromiseRetryOptions,
) => {
  let retryCount = 0;

  /** 记录错误列表 */
  const errorList: Error[] = [];

  const getDelay = typeof delay === "function" ? delay : () => delay;

  return new Promise<T>((resolve, reject) => {
    const attempt = () => {
      ensureCreatePromiseFlowNormal(() => createPromise(retryCount))
        .then(resolve)
        .catch((error) => {
          errorList.push(error);

          if (canRetry(retryCount)) {
            retryCount++;

            const delay = getDelay(retryCount);

            if (delay > 0) {
              setTimeout(attempt, delay);
            } else {
              attempt();
            }
          } else {
            reject(new XPromiseRetryError(errorList));
          }
        });
    };

    attempt();
  });
};
