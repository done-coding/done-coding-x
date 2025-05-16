import { usePromiseRetry } from "./retry";

/** promise 轮询 */
export const usePromisePolling = <T>(
  ...args: Parameters<typeof usePromiseRetry<T>>
) => {
  const {
    startRetry: startPolling,
    stopRetry: stopPolling,
    getStatus,
    isRetrying: isPolling,
  } = usePromiseRetry(...args);

  return {
    /** 开始轮询 */
    startPolling,
    /** 停止轮询 */
    stopPolling,
    /** 获取轮询状态 */
    getStatus,
    /** 判断是在轮询中 */
    isPolling,
  };
};
