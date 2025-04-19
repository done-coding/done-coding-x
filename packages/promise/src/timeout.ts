/** promise 超时设置 */
export function promiseTimeout<T>(
  promise: Promise<T>,
  timeout: number,
): Promise<T> {
  console.log("timeout:", timeout);
  console.log("promise:", promise);
  return promise;
}
