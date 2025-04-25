import { XPromiseError } from "@/error";
import { XPromiseErrorCodeEnum } from "@/utils";

/** 重试错误 */
export class XPromiseRetryError extends XPromiseError {
  public constructor(public errorList: Error[]) {
    const execCount = errorList.length;
    super(
      XPromiseErrorCodeEnum.MAX_RETRY_FAILED,
      `执行${execCount}次，最终仍失败`,
    );
  }
}

/** promise 重试 */
export const promiseRetry = <P extends Promise<any>>(
  createPromise: () => P,
  {
    maxRetry: maxRetryInit,
    getDelay = () => 0,
  }: {
    /** 最大重试次数 */
    maxRetry: number;
    /** 延迟时间 */
    getDelay?: (retryCount: number) => number;
  },
) => {
  let retryCount = 0;

  if (maxRetryInit < 0) {
    console.error("最大重试次数不能小于0， 此处将使用默认值 0");
  }

  const maxRetry = Math.max(maxRetryInit, 0);

  /** 记录错误列表 */
  const errorList: Error[] = [];

  return new Promise<P>((resolve, reject) => {
    const attempt = () => {
      createPromise()
        .then(resolve)
        .catch((error) => {
          errorList.push(error);

          if (retryCount < maxRetry) {
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
