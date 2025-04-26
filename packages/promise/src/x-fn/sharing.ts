import { ensureCreatePromiseFlowNormal } from "@/utils";

/** promise 共享 */
export const usePromiseSharing = <T>(createPromise: () => Promise<T>) => {
  let promise: Promise<T> | undefined;

  const applyPromise = () => {
    if (!promise) {
      promise = ensureCreatePromiseFlowNormal(() => createPromise());
      // 与外界使用promise并行 只是这里处理promise出错重置共享promise
      promise.catch(() => {
        promise = undefined;
        console.log("Promise sharing: promise出错，已重置");
      });
    }
    return promise;
  };

  return {
    applyPromise,
  };
};
