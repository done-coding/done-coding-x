/** promise 共享设置 */
export function promiseSharing<T>(promise: Promise<T>): Promise<T> {
  console.log("promiseSharing", promise);
  console.log("promiseSharing", promise.constructor.name);
  return promise;
}
