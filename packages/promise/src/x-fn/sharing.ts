import { ensureCreatePromiseFlowNormal, XPromiseStateEnum } from "@/utils";

export interface XPromiseSharingOptions {
  /** 是否在promise reject时清理 */
  rejectClean?: boolean;
  /** 是否在promise resolve时清理 */
  resolveClean?: boolean;
}

/** promise 共享 */
export const usePromiseSharing = <T>(
  createPromise: () => Promise<T>,
  { rejectClean = true, resolveClean = true }: XPromiseSharingOptions = {},
) => {
  let promise: Promise<T> | undefined;

  /** promise 状态 */
  let status: XPromiseStateEnum = XPromiseStateEnum.NOT_STARTED;

  /** 是否存在promise */
  const isHasPromise = () => status !== XPromiseStateEnum.NOT_STARTED;

  /** 获取当前promise */
  const getCurrentPromise = () => promise;

  const applyPromise = () => {
    if (promise) {
      return promise;
    }

    status = XPromiseStateEnum.PENDING;

    promise = ensureCreatePromiseFlowNormal(() => createPromise());

    promise
      .then(() => {
        status = XPromiseStateEnum.FULFILLED;
        if (resolveClean) {
          promise = undefined;
          console.log("Promise sharing: promise resolve，已重置");
        }
      })
      .catch(() => {
        status = XPromiseStateEnum.REJECTED;
        if (rejectClean) {
          promise = undefined;
          console.log("Promise sharing: promise reject，已重置");
        }
      });

    promise.finally(() => {
      status = XPromiseStateEnum.NOT_STARTED;
    });

    return promise;
  };

  /**
   * 清除promise
   */
  const clearPromise = async (): Promise<unknown> => {
    switch (status) {
      case XPromiseStateEnum.NOT_STARTED: {
        console.warn("Promise sharing: promise clear，promise未开始");
        return;
      }
      case XPromiseStateEnum.PENDING: {
        console.warn("Promise sharing: promise clear，promise等待中");
        return promise!.finally(() => {
          promise = undefined;
        });
      }
      case XPromiseStateEnum.FULFILLED:
      case XPromiseStateEnum.REJECTED: {
        promise = undefined;
        return;
      }
    }
  };

  /** 获取promise状态 */
  const getStatus = () => status;

  return {
    /** 获取promise状态 */
    getStatus,
    /** 是否存在promise */
    isHasPromise,
    /** 应用promise */
    applyPromise,
    /** 清除promise */
    clearPromise,
    /** 获取当前promise */
    getCurrentPromise,
  };
};
