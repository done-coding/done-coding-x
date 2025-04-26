import { type XPromiseRetryOptions, promiseRetry } from "./retry";

/** promise 轮询 */
export const promisePolling = <T>(
  createPromise: (
    /** 当前重试次数 */
    retryCount: number,
  ) => Promise<T>,
  {
    maxRetry,
    delay,
  }: Omit<XPromiseRetryOptions, "maxRetry" | "canRetry"> &
    Required<Pick<XPromiseRetryOptions, "maxRetry">>,
) => {
  return promiseRetry(createPromise, {
    canRetry: (retryCount) => retryCount < maxRetry,
    delay,
  });
};
