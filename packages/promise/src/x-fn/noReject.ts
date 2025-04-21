/** promise 不会reject设置 */
export function promiseNoReject<T>(
  promise: Promise<T>,
  defaultValue?: T | (() => T),
): Promise<T> {
  console.log("promiseNoReject", promise, defaultValue);
  return promise;
}
