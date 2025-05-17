import { describe, test, expect, vi } from "vitest";
import { usePromisePolling, XPromiseRetryError } from "@/x-fn";
import { XPromiseErrorCodeEnum, XPromiseStateEnum } from "@/utils";

describe("polling", () => {
  test("首次成功不需要轮询", async () => {
    const mockFn = vi.fn().mockResolvedValue("success");
    const { startPolling } = usePromisePolling(mockFn, { maxRetry: 3 });
    const result = await startPolling();
    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("轮询直到成功", async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("first error"))
      .mockRejectedValueOnce(new Error("second error"))
      .mockResolvedValue("success");
    const { startPolling } = usePromisePolling(mockFn, { maxRetry: 3 });
    const result = await startPolling();
    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  test("超过最大轮询次数后失败", async () => {
    const error = new Error("test error");
    const mockFn = vi.fn().mockRejectedValue(error);
    const { startPolling } = usePromisePolling(mockFn, { maxRetry: 2 });
    const promise = startPolling();
    promise.catch(() => {}); // 显式处理拒绝
    try {
      await promise;
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).retryCount).toBe(2);
      expect((e as XPromiseRetryError).errorMessageList).toHaveLength(3);
      expect((e as XPromiseRetryError).code).toBe(
        XPromiseErrorCodeEnum.RETRY_EXCEED_LIMIT,
      );
    }
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  test("自定义轮询条件", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const canRetry = vi.fn().mockReturnValue(false);
    const { startPolling } = usePromisePolling(mockFn, { canRetry });
    const promise = startPolling();
    promise.catch(() => {}); // 显式处理拒绝
    try {
      await promise;
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).retryCount).toBe(0);
      expect((e as XPromiseRetryError).errorMessageList).toHaveLength(1);
      expect((e as XPromiseRetryError).code).toBe(
        XPromiseErrorCodeEnum.RETRY_EXCEED_LIMIT,
      );
    }
    expect(canRetry).toHaveBeenCalledWith(
      { retryCount: 0, runTime: expect.any(Number) },
      expect.any(Error),
    );
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("带延迟的轮询", async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("first error"))
      .mockResolvedValue("success");

    const startTime = Date.now();
    const { startPolling } = usePromisePolling(mockFn, {
      maxRetry: 3,
      delay: 100,
    });
    const promise = startPolling();
    promise.catch(() => {}); // 显式处理拒绝
    const result = await promise;
    const endTime = Date.now();

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(endTime - startTime).toBeGreaterThanOrEqual(100);
  });

  test("动态延迟时间", async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("first error"))
      .mockResolvedValue("success");

    const delay = vi.fn().mockReturnValue(100);
    const { startPolling } = usePromisePolling(mockFn, {
      maxRetry: 3,
      delay,
    });
    const promise = startPolling();
    promise.catch(() => {}); // 显式处理拒绝
    const result = await promise;

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledWith(
      { retryCount: 0, runTime: expect.any(Number) },
      expect.any(Error),
    );
  });

  test("最大运行时间限制", async () => {
    const mockFn = vi.fn().mockImplementation(() => {
      return new Promise<void>((resolve) => {
        setTimeout(resolve, 100);
      });
    });
    const { startPolling } = usePromisePolling(mockFn, {
      maxRetry: 3,
      maxRunTime: 50,
    });
    const promise = startPolling();
    promise.catch(() => {}); // 显式处理拒绝
    try {
      await promise;
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).code).toBe(
        XPromiseErrorCodeEnum.RETRY_EXCEED_LIMIT,
      );
      expect((e as XPromiseRetryError).runTime).toBeGreaterThanOrEqual(50);
    }
  });

  test("错误消息列表长度限制", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const { startPolling } = usePromisePolling(mockFn, {
      maxRetry: 20,
      maxErrorMessageListLength: 3,
    });
    const promise = startPolling();
    promise.catch(() => {}); // 显式处理拒绝
    try {
      await promise;
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).errorMessageList).toHaveLength(3);
    }
  });

  test("停止轮询", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const { startPolling, stopPolling } = usePromisePolling(mockFn, {
      maxRetry: 3,
      delay: 100,
    });

    const promise = startPolling();
    promise.catch(() => {}); // 显式处理拒绝
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
    stopPolling();

    try {
      await promise;
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).code).toBe(XPromiseErrorCodeEnum.ABORT);
    }
  });

  test("轮询状态管理", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const { startPolling, getStatus, isPolling } = usePromisePolling(mockFn, {
      maxRetry: 3,
      delay: 100,
    });

    expect(getStatus()).toBe(XPromiseStateEnum.NOT_STARTED);
    expect(isPolling()).toBe(false);

    const promise = startPolling();
    promise.catch(() => {}); // 显式处理拒绝
    expect(getStatus()).toBe(XPromiseStateEnum.PENDING);
    expect(isPolling()).toBe(true);

    try {
      await promise;
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
    }

    expect(getStatus()).toBe(XPromiseStateEnum.NOT_STARTED);
    expect(isPolling()).toBe(false);
  });

  test("canRetry函数执行错误", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const canRetry = vi.fn().mockImplementation(() => {
      throw new Error("canRetry error");
    });
    const { startPolling } = usePromisePolling(mockFn, { canRetry });
    const promise = startPolling();
    promise.catch(() => {}); // 显式处理拒绝
    try {
      await promise;
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).code).toBe(
        XPromiseErrorCodeEnum.RETRY_CAN_RETRY_FN_FAILED,
      );
    }
  });

  test("delay函数执行错误-不重试", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const delay = vi.fn().mockImplementation(() => {
      throw new Error("delay error");
    });
    const { startPolling } = usePromisePolling(mockFn, { delay });
    const promise = startPolling();
    promise.catch(() => {}); // 显式处理拒绝
    try {
      await promise;
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).code).toBe(
        XPromiseErrorCodeEnum.RETRY_EXCEED_LIMIT,
      );
    }
  });

  test("delay函数执行错误-重试", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const delay = vi.fn().mockImplementation(() => {
      throw new Error("delay error");
    });
    const { startPolling } = usePromisePolling(mockFn, { delay, maxRetry: 3 });
    const promise = startPolling();
    promise.catch(() => {}); // 显式处理拒绝
    try {
      await promise;
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).retryCount).toBe(0);
      expect((e as XPromiseRetryError).code).toBe(
        XPromiseErrorCodeEnum.RETRY_DELAY_FN_FAILED,
      );
    }
  });
});
