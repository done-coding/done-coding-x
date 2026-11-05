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

  /** 当前轮次：工厂可能复用同一个 promise，不能用 promise 引用区分轮次 */
  let currentRound: object | undefined;

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

  /** 清除当前 promise 并回到未开始 */
  const clearCurrentPromise = () => {
    promise = undefined;
    currentRound = undefined;
    changeStatus(XPromiseStateEnum.NOT_STARTED);
  };

  const applyPromise = (): Promise<T> => {
    if (promise) {
      return promise;
    }

    const round = {};
    currentRound = round;

    // 工厂执行时状态已是等待中；PENDING 事件要等 promise 保存后才通知，监听器重入时才能共享
    status = XPromiseStateEnum.PENDING;
    const currentPromise = ensureCreatePromiseFlowNormal(() => createPromise());
    promise = currentPromise;

    /** 结算本轮 */
    const settle = (nextStatus: XPromiseStateEnum, clean: boolean) => {
      changeStatus(nextStatus);
      // 监听器可能已清除本轮或开始新一轮
      if (clean && currentRound === round) {
        clearCurrentPromise();
      }
    };

    // 同时提供失败分支，避免内部链产生未处理拒绝；失败由调用方通过返回的 promise 处理
    // 先于 PENDING 通知挂接，监听器挂接的回调才能看到结算后的状态
    currentPromise.then(
      () => settle(XPromiseStateEnum.FULFILLED, resolveClean),
      () => settle(XPromiseStateEnum.REJECTED, rejectClean),
    );

    eventManager.trigger({
      type: XPromiseStateEnum.PENDING,
    });

    return currentPromise;
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
        const round = currentRound;
        return promise!
          .then(() => {
            return;
          })
          .finally(() => {
            // 等待期间可能已开始新一轮，不能覆盖
            if (currentRound === round) {
              clearCurrentPromise();
            }
          });
      }
      case XPromiseStateEnum.FULFILLED:
      case XPromiseStateEnum.REJECTED: {
        clearCurrentPromise();
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
      // 失败成功无所谓 主要目的是删除map中的key；失败由 apply 的调用方处理
      targetPromiseSharing.clearPromise().catch(() => {});
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
