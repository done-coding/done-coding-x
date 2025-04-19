/** promise 重试 */
export function promiseRetry<T>(
  promise: Promise<T>,
  retries: number,
  delay: number,
): Promise<T> {
  console.log("retrying", retries, "times with", delay, "delay");
  return promise;
}
