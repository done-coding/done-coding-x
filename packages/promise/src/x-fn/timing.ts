/** promise 定时 */
export function promiseTiming<T>(promise: Promise<T>, time: number) {
  console.log("promiseTiming", promise, time);
  return promise;
}
