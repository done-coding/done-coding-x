import { describe, test, expect, vi } from "vitest";
import { usePromiseSharing, XPromiseSharingManager } from "@/x-fn";
import { XPromiseStateEnum } from "@/utils";
import { TestErrorMessages } from "./constants/error-messages";

/** 等待已排队的 promise 回调和未处理拒绝检测完成 */
const flush = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

const noop = () => {};

const createRejected = () =>
  Promise.reject(new Error(TestErrorMessages.SHARING.SYNC_ERROR));

/** 统计回调执行期间产生的未处理拒绝（当前监听器优先于 vitest 的全局统计） */
const countUnhandledRejections = async (run: () => Promise<void>) => {
  const previous = process.listeners("unhandledRejection");
  process.removeAllListeners("unhandledRejection");
  let count = 0;
  const listener = () => {
    count++;
  };
  process.on("unhandledRejection", listener);
  try {
    await run();
    await flush();
  } finally {
    process.off("unhandledRejection", listener);
    previous.forEach((item) => process.on("unhandledRejection", item));
  }
  return count;
};

/** 记录共享实例的状态事件 */
const recordStatus = (
  sharing: Pick<ReturnType<typeof usePromiseSharing>, "eventManager">,
) => {
  const events: XPromiseStateEnum[] = [];
  [
    XPromiseStateEnum.NOT_STARTED,
    XPromiseStateEnum.PENDING,
    XPromiseStateEnum.FULFILLED,
    XPromiseStateEnum.REJECTED,
  ].forEach((status) => {
    sharing.eventManager.on(status, () => events.push(status));
  });
  return events;
};

describe("sharing", () => {
  // 在每个测试前模拟 console.log
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  // 在每个测试后恢复 console.log
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("多次调用共享同一个Promise", async () => {
    const mockFn = vi.fn().mockResolvedValue("success");
    const { applyPromise } = usePromiseSharing(mockFn);

    const promise1 = applyPromise();
    const promise2 = applyPromise();

    expect(promise1).toBe(promise2);
    const [result1, result2] = await Promise.all([promise1, promise2]);
    expect(result1).toBe("success");
    expect(result2).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("Promise失败后重置共享状态", async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error(TestErrorMessages.SHARING.FIRST_ERROR))
      .mockResolvedValue("success");
    const { applyPromise } = usePromiseSharing(mockFn);

    const promise1 = applyPromise();
    try {
      await promise1;
    } catch (error: unknown) {
      if (error instanceof Error) {
        expect(error.message).toBe(TestErrorMessages.SHARING.FIRST_ERROR);
      }
    }

    // 等待状态重置
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    const promise2 = applyPromise();
    expect(promise1).not.toBe(promise2);
    const result = await promise2;
    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  test("同步错误也会重置共享状态", async () => {
    let shouldThrow = true;
    const mockFn = vi.fn(() => {
      if (shouldThrow) {
        shouldThrow = false;
        throw new Error(TestErrorMessages.SHARING.SYNC_ERROR);
      }
      return Promise.resolve("success");
    });

    const { applyPromise } = usePromiseSharing(mockFn);

    try {
      await applyPromise();
    } catch (error: any) {
      expect(error.message).toBe(TestErrorMessages.SHARING.SYNC_ERROR);
    }

    // 等待状态重置
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    const result = await applyPromise();
    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  test("调用方已处理失败时，不产生未处理拒绝", async () => {
    const count = await countUnhandledRejections(async () => {
      const { applyPromise } = usePromiseSharing(() =>
        Promise.reject(new Error(TestErrorMessages.SHARING.SYNC_ERROR)),
      );
      await applyPromise().catch(() => {});
    });

    expect(count).toBe(0);
  });

  test("成功和失败后的状态事件顺序正确，最终回到未开始", async () => {
    const success = usePromiseSharing(() => Promise.resolve("success"));
    const successEvents = recordStatus(success);
    await success.applyPromise();
    await flush();
    expect(successEvents).toEqual([
      XPromiseStateEnum.PENDING,
      XPromiseStateEnum.FULFILLED,
      XPromiseStateEnum.NOT_STARTED,
    ]);
    expect(success.getStatus()).toBe(XPromiseStateEnum.NOT_STARTED);

    const failure = usePromiseSharing(() =>
      Promise.reject(new Error(TestErrorMessages.SHARING.SYNC_ERROR)),
    );
    const failureEvents = recordStatus(failure);
    await failure.applyPromise().catch(() => {});
    await flush();
    expect(failureEvents).toEqual([
      XPromiseStateEnum.PENDING,
      XPromiseStateEnum.REJECTED,
      XPromiseStateEnum.NOT_STARTED,
    ]);
    expect(failure.getStatus()).toBe(XPromiseStateEnum.NOT_STARTED);
    expect(failure.isHasPromise()).toBe(false);
  });

  test("resolveClean 为 false 时保留结果，clearPromise 可以清除", async () => {
    const mockFn = vi.fn().mockResolvedValue("success");
    const sharing = usePromiseSharing(mockFn, { resolveClean: false });

    const promise = sharing.applyPromise();
    await promise;
    await flush();
    expect(sharing.getStatus()).toBe(XPromiseStateEnum.FULFILLED);
    expect(sharing.isHasPromise()).toBe(true);
    expect(sharing.applyPromise()).toBe(promise);

    await sharing.clearPromise();
    expect(sharing.getStatus()).toBe(XPromiseStateEnum.NOT_STARTED);
    expect(sharing.isHasPromise()).toBe(false);
    expect(sharing.getCurrentPromise()).toBeUndefined();

    await sharing.applyPromise();
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  test("rejectClean 为 false 时保留失败结果，clearPromise 可以清除", async () => {
    const sharing = usePromiseSharing(
      () => Promise.reject(new Error(TestErrorMessages.SHARING.SYNC_ERROR)),
      { rejectClean: false },
    );

    await sharing.applyPromise().catch(() => {});
    await flush();
    expect(sharing.getStatus()).toBe(XPromiseStateEnum.REJECTED);
    expect(sharing.isHasPromise()).toBe(true);

    await sharing.clearPromise();
    expect(sharing.getStatus()).toBe(XPromiseStateEnum.NOT_STARTED);
    expect(sharing.getCurrentPromise()).toBeUndefined();
  });

  test("等待中调用 clearPromise，任务结束后清除", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let resolveFirst: (value: string) => void = noop;
    const sharing = usePromiseSharing(
      () =>
        new Promise<string>((resolve) => {
          resolveFirst = resolve;
        }),
      { resolveClean: false },
    );

    sharing.applyPromise();
    const cleared = sharing.clearPromise();
    resolveFirst("first");
    await cleared;

    expect(sharing.getCurrentPromise()).toBeUndefined();
    expect(sharing.getStatus()).toBe(XPromiseStateEnum.NOT_STARTED);
  });

  test("等待中的清理尚未结束时开始新任务，新任务不被覆盖", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let resolveFirst: (value: string) => void = noop;
    const mockFn = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(() => new Promise(noop));
    const sharing = usePromiseSharing(mockFn, { resolveClean: false });
    let second: Promise<unknown> | undefined;
    // 结算监听器先于 clearPromise 的清理执行，此时旧清理尚未结束
    sharing.eventManager.once(XPromiseStateEnum.FULFILLED, () => {
      sharing.clearPromise();
      second = sharing.applyPromise();
    });

    sharing.applyPromise();
    const cleared = sharing.clearPromise();
    resolveFirst("first");
    await cleared;
    await flush();

    expect(second).toBeDefined();
    expect(sharing.getCurrentPromise()).toBe(second);
    expect(sharing.getStatus()).toBe(XPromiseStateEnum.PENDING);
  });

  test("工厂执行时状态已是等待中，可防止重复启动", async () => {
    const statuses: XPromiseStateEnum[] = [];
    const hasPromises: boolean[] = [];
    let callCount = 0;
    const sharing = usePromiseSharing(() => {
      callCount++;
      statuses.push(sharing.getStatus());
      hasPromises.push(sharing.isHasPromise());
      if (!sharing.isHasPromise()) {
        sharing.applyPromise();
      }
      return Promise.resolve("success");
    });

    await sharing.applyPromise();

    expect(statuses).toEqual([XPromiseStateEnum.PENDING]);
    expect(hasPromises).toEqual([true]);
    expect(callCount).toBe(1);
  });

  test("PENDING 监听器挂接的失败回调可以重新申请", async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error(TestErrorMessages.SHARING.SYNC_ERROR))
      .mockResolvedValueOnce("retried");
    const sharing = usePromiseSharing(mockFn);
    let retried: Promise<unknown> | undefined;
    let statusInCatch: XPromiseStateEnum | undefined;
    sharing.eventManager.once(XPromiseStateEnum.PENDING, () => {
      sharing.applyPromise().catch(() => {
        statusInCatch = sharing.getStatus();
        retried = sharing.applyPromise();
      });
    });

    await sharing.applyPromise().catch(noop);
    await flush();

    expect(statusInCatch).toBe(XPromiseStateEnum.NOT_STARTED);
    await expect(retried).resolves.toBe("retried");
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  test("工厂复用同一个 promise 时，每轮都有完整的结算事件", async () => {
    const cached = Promise.resolve("cached");
    const sharing = usePromiseSharing(() => cached);
    const events = recordStatus(sharing);
    sharing.eventManager.once(XPromiseStateEnum.FULFILLED, () => {
      sharing.clearPromise();
      sharing.applyPromise();
    });

    await sharing.applyPromise();
    await flush();

    expect(events).toEqual([
      XPromiseStateEnum.PENDING,
      XPromiseStateEnum.FULFILLED,
      XPromiseStateEnum.NOT_STARTED,
      XPromiseStateEnum.PENDING,
      XPromiseStateEnum.FULFILLED,
      XPromiseStateEnum.NOT_STARTED,
    ]);
  });

  test("工厂复用同一个 promise 时，旧清理不删除新一轮保留的结果", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const cached = Promise.resolve("cached");
    const sharing = usePromiseSharing(() => cached, { resolveClean: false });
    sharing.eventManager.once(XPromiseStateEnum.FULFILLED, () => {
      sharing.clearPromise();
      sharing.applyPromise();
    });

    sharing.applyPromise();
    const cleared = sharing.clearPromise();
    await cleared;
    await flush();

    expect(sharing.getStatus()).toBe(XPromiseStateEnum.FULFILLED);
    expect(sharing.getCurrentPromise()).toBe(cached);
  });

  test("PENDING 监听器内重入 applyPromise，仍共享同一个任务", async () => {
    const mockFn = vi.fn().mockResolvedValue("success");
    const sharing = usePromiseSharing(mockFn);
    let reentered: Promise<unknown> | undefined;
    sharing.eventManager.once(XPromiseStateEnum.PENDING, () => {
      reentered = sharing.applyPromise();
    });

    const promise = sharing.applyPromise();
    expect(reentered).toBe(promise);
    await promise;
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("PENDING 监听器内调用 clearPromise 不报错", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const sharing = usePromiseSharing(() => Promise.resolve("success"));
    let cleared: Promise<void> | undefined;
    sharing.eventManager.once(XPromiseStateEnum.PENDING, () => {
      cleared = sharing.clearPromise();
    });

    await sharing.applyPromise();
    await expect(cleared).resolves.toBeUndefined();
  });

  test("结算监听器内启动的新任务不被旧任务的清理覆盖", async () => {
    const mockFn = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockImplementationOnce(() => new Promise(() => {}));
    const sharing = usePromiseSharing(mockFn);
    let second: Promise<unknown> | undefined;
    sharing.eventManager.once(XPromiseStateEnum.FULFILLED, () => {
      sharing.clearPromise();
      second = sharing.applyPromise();
    });

    await sharing.applyPromise();
    await flush();

    expect(second).toBeDefined();
    expect(sharing.getCurrentPromise()).toBe(second);
    expect(sharing.getStatus()).toBe(XPromiseStateEnum.PENDING);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});

describe("XPromiseSharingManager", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("相同 key 共享、不同 key 隔离", async () => {
    const manager = XPromiseSharingManager.create();
    const mockFn = vi.fn().mockResolvedValue("success");

    const first = manager.apply("a", mockFn);
    expect(manager.apply("a", mockFn)).toBe(first);
    expect(manager.apply("b", mockFn)).not.toBe(first);
    await flush();

    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  test("成功后再次申请会创建新任务", async () => {
    const manager = XPromiseSharingManager.create();
    const mockFn = vi.fn().mockResolvedValue("success");

    await manager.apply("a", mockFn);
    await flush();
    await manager.apply("a", mockFn);

    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  test("失败后可重新申请，且不产生未处理拒绝", async () => {
    const manager = XPromiseSharingManager.create();
    const count = await countUnhandledRejections(async () => {
      await manager.apply("a", createRejected).catch(noop);
    });
    expect(count).toBe(0);

    await expect(
      manager.apply("a", () => Promise.resolve("success")),
    ).resolves.toBe("success");
  });

  test("等待中 clear 后任务失败，不产生未处理拒绝", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const manager = XPromiseSharingManager.create();
    const count = await countUnhandledRejections(async () => {
      let rejectTask: (reason: Error) => void = () => {};
      const task = manager.apply(
        "a",
        () =>
          new Promise<string>((_resolve, reject) => {
            rejectTask = reject;
          }),
      );
      task.catch(() => {});

      manager.clear("a");
      rejectTask(new Error(TestErrorMessages.SHARING.SYNC_ERROR));
      await flush();
    });

    expect(count).toBe(0);
  });

  test("等待中 clear 后可用相同 key 开始新任务，旧任务结束不影响新任务", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const manager = XPromiseSharingManager.create();
    let resolveFirst: (value: string) => void = () => {};
    manager.apply(
      "a",
      () =>
        new Promise<string>((resolve) => {
          resolveFirst = resolve;
        }),
    );

    manager.clear("a");
    const mockFn = vi.fn(() => new Promise<string>(() => {}));
    const second = manager.apply("a", mockFn);
    resolveFirst("first");
    await flush();

    expect(manager.apply("a", mockFn)).toBe(second);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
