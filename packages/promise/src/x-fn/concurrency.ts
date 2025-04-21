/** promise并发 */
export function concurrency<T>(promises: Promise<T>[], limit: number) {
  console.log(promises, limit);
  return promises;
}
