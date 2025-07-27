import { describe, test, expect, vi } from "vitest";
import { usePromisePolling, XPromiseRetryError } from "@/x-fn";
import { XPromiseErrorCodeEnum, XPromiseStateEnum } from "@/utils";

describe("polling", () => {
  test("maxPollingCount=1 时只轮询一次", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const { startPolling } = usePromisePolling(mockFn, { maxPollingCount: 1 });
    await startPolling().catch(() => {});
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("maxPollingCount=3 时轮询三次", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const { startPolling } = usePromisePolling(mockFn, { maxPollingCount: 3 });
    await startPolling().catch(() => {});
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  test("maxPollingCount=0 时等价于1次", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const { startPolling } = usePromisePolling(mockFn, { maxPollingCount: 0 });
    await startPolling().catch(() => {});
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("canPolling 控制提前终止", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const canPolling = vi
      .fn()
      .mockImplementation(({ pollingCount }) => pollingCount < 2);
    const { startPolling } = usePromisePolling(mockFn, {
      maxPollingCount: 5,
      canPolling,
    });
    await startPolling().catch(() => {});
    await Promise.resolve(); // 等待异步流程
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(canPolling).toHaveBeenCalledWith(
      { pollingCount: 1, runTime: expect.any(Number) },
      expect.any(Error),
    );
  });

  test("startPolling 返回 Promise<void>", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const { startPolling } = usePromisePolling(mockFn, { maxPollingCount: 2 });
    const result = startPolling();
    expect(result).toBeInstanceOf(Promise);
    await result.catch(() => {});
  });

  test("轮询成功提前结束", async () => {
    const mockFn = vi.fn();
    const { startPolling } = usePromisePolling(mockFn, {
      maxPollingCount: 5,
      delay: 10,
    });
    await startPolling();
    expect(mockFn).toHaveBeenCalledTimes(5);
  });

  test("最大运行时间限制", async () => {
    vi.useFakeTimers();
    const mockFn = vi.fn().mockImplementation(() => {
      return new Promise<void>((resolve) => {
        setTimeout(resolve, 100);
      });
    });
    const { startPolling } = usePromisePolling(mockFn, {
      maxPollingCount: 3,
      maxRunTime: 50,
    });
    const promise = startPolling();
    vi.advanceTimersByTime(100);
    await Promise.resolve(); // 推进微任务
    try {
      await promise;
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).code).toBe(
        XPromiseErrorCodeEnum.RETRY_EXCEED_LIMIT,
      );
      expect((e as XPromiseRetryError).runTime).toBeGreaterThanOrEqual(50);
    }
    vi.useRealTimers();
  });

  test("停止轮询", async () => {
    vi.useFakeTimers();
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const { startPolling, stopPolling } = usePromisePolling(mockFn, {
      maxPollingCount: 3,
      delay: 100,
    });
    const promise = startPolling();
    setTimeout(() => stopPolling(), 50);
    vi.advanceTimersByTime(50);
    await Promise.resolve(); // 推进微任务
    try {
      await promise;
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).code).toBe(XPromiseErrorCodeEnum.ABORT);
    }
    vi.useRealTimers();
  });

  test("轮询状态管理", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const { startPolling, getStatus, isPolling } = usePromisePolling(mockFn, {
      maxPollingCount: 3,
      delay: 100,
    });
    expect(getStatus()).toBe(XPromiseStateEnum.NOT_STARTED);
    expect(isPolling()).toBe(false);
    const promise = startPolling();
    await Promise.resolve(); // 等待微任务
    expect(getStatus()).toBe(XPromiseStateEnum.PENDING);
    expect(isPolling()).toBe(true);
    await promise.catch(() => {});
    await Promise.resolve(); // 再等一次，确保状态切换
    expect(getStatus()).toBe(XPromiseStateEnum.NOT_STARTED);
    expect(isPolling()).toBe(false);
  });

  test("canPolling函数执行错误", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const canPolling = vi.fn().mockImplementation(() => {
      throw new Error("canPolling error");
    });
    const { startPolling } = usePromisePolling(mockFn, {
      maxPollingCount: 3,
      canPolling,
    });
    try {
      await startPolling();
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).code).toBe(
        XPromiseErrorCodeEnum.RETRY_CAN_CONDITION_FN_FAILED,
      );
    }
  });

  test("delay函数执行错误", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const delay = vi.fn().mockImplementation(() => {
      throw new Error("delay error");
    });
    const { startPolling } = usePromisePolling(mockFn, {
      maxPollingCount: 3,
      delay,
    });
    try {
      await startPolling();
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).code).toBe(
        XPromiseErrorCodeEnum.RETRY_DELAY_FN_FAILED,
      );
    }
  });
});
