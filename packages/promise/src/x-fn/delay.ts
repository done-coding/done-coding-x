export function promiseDelay<T>(
  promise: Promise<T>,
  delay: number,
): Promise<T> {
  console.log("delaying promise for", delay, "milliseconds");
  return promise;
}
