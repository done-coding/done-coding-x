import { ensureCreatePromiseFlowNormal } from "@/utils";

/** promise 不会reject设置 */
export function promiseNoReject<T>(
  /** promise创建函数 */
  createPromise: () => Promise<T>,
  /** 失败时的默认值 */
  defaultValue: T | (() => T),
): Promise<T> {
  const promise = ensureCreatePromiseFlowNormal(createPromise);
  return promise.catch(() => {
    return typeof defaultValue === "function"
      ? (defaultValue as () => T)()
      : defaultValue;
  });
}
