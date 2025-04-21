/** promise被终止 */
export function promiseAbort(promise: Promise<any>, reason: any) {
  console.log("Aborting promise:", reason);
  return promise;
}
