import { EventManager } from "@done-coding/x-event";
import { ensureCreatePromiseFlowNormal, XPromiseStateEnum } from "@/utils";

export interface XPromiseSharingOptions {
  /**
   * 是否在promise reject时清理 promise
   * @default true
   */
  rejectClean?: boolean;
  /**
   * 是否在promise resolve时清理 promise
   * @default true
   */
  resolveClean?: boolean;
}

/** 状态监听 */
export type PromiseSharingStatusListener = () => void;

/** promise 共享 */
export const usePromiseSharing = <T>(
  createPromise: () => Promise<T>,
  { rejectClean = true, resolveClean = true }: XPromiseSharingOptions = {},
) => {
  const eventManager = EventManager.create();

  let promise: Promise<T> | undefined;

  /** promise 状态 */
  let status: XPromiseStateEnum = XPromiseStateEnum.NOT_STARTED;

  /** 是否存在promise */
  const isHasPromise = () => status !== XPromiseStateEnum.NOT_STARTED;

  /** 获取当前promise */
  const getCurrentPromise = () => promise;

  /** 状态改变 */
  const changeStatus = (nextStatus: XPromiseStateEnum) => {
    if (nextStatus === status) {
      return;
    }
    status = nextStatus;
    eventManager.trigger({
      type: status,
    });
  };

  const applyPromise = (): Promise<T> => {
    if (promise) {
      return promise;
    }

    // status = XPromiseStateEnum.PENDING;

    changeStatus(XPromiseStateEnum.PENDING);

    promise = ensureCreatePromiseFlowNormal(() => createPromise());

    promise
      .then(() => {
        // status = XPromiseStateEnum.FULFILLED;
        changeStatus(XPromiseStateEnum.FULFILLED);
        if (resolveClean) {
          promise = undefined;
          // console.log("Promise sharing: promise resolve，已重置");
        }
      })
      .catch(() => {
        // status = XPromiseStateEnum.REJECTED;
        changeStatus(XPromiseStateEnum.REJECTED);
        if (rejectClean) {
          promise = undefined;
          // console.log("Promise sharing: promise reject，已重置");
        }
      });

    promise.finally(() => {
      // status = XPromiseStateEnum.NOT_STARTED;
      changeStatus(XPromiseStateEnum.NOT_STARTED);
    });

    return promise;
  };

  /**
   * 清除promise
   */
  const clearPromise = async (): Promise<void> => {
    switch (status) {
      case XPromiseStateEnum.NOT_STARTED: {
        console.warn("Promise sharing: promise clear，promise未开始");
        return;
      }
      case XPromiseStateEnum.PENDING: {
        console.warn("Promise sharing: promise clear，promise等待中");
        return promise!
          .then(() => {
            return;
          })
          .finally(() => {
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
    /** 事件管理器 */
    eventManager,
  };
};

/** 共享promise管理 */
export class XPromiseSharingManager {
  public static create() {
    return new this();
  }
  private map: Map<string, ReturnType<typeof usePromiseSharing<any>>> =
    new Map();

  private constructor() {}

  /** 清除共享 */
  public clear = (key: string): void => {
    const targetPromiseSharing = this.map.get(key);
    if (targetPromiseSharing) {
      // 失败成功无所谓 主要目的是删除map中的key
      targetPromiseSharing.clearPromise();
      targetPromiseSharing.eventManager.clear();
      this.map.delete(key);
    }
  };

  /** 申请共享 */
  public apply = <T>(
    key: string,
    createPromise: () => Promise<T>,
  ): Promise<T> => {
    const targetPromiseSharing = this.map.get(key);
    if (!targetPromiseSharing) {
      const promiseSharing = usePromiseSharing(createPromise, {
        rejectClean: true,
        resolveClean: true,
      });
      this.map.set(key, promiseSharing);

      promiseSharing.eventManager.once(XPromiseStateEnum.FULFILLED, () => {
        this.clear(key);
      });
      promiseSharing.eventManager.once(XPromiseStateEnum.REJECTED, () => {
        this.clear(key);
      });
    }
    return this.map.get(key)!.applyPromise();
  };
}
