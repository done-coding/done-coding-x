import { describe, test, expect, vi } from "vitest";
import { usePromiseRetry, XPromiseRetryError } from "@/x-fn";
import { XPromiseErrorCodeEnum, XPromiseStateEnum } from "@/utils";

describe("retry", () => {
  test("首次成功不需要重试", async () => {
    const mockFn = vi.fn().mockResolvedValue("success");
    const { startRetry } = usePromiseRetry(mockFn, { maxRetry: 3 });
    const result = await startRetry();
    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("失败后重试成功", async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("first error"))
      .mockResolvedValue("success");
    const { startRetry } = usePromiseRetry(mockFn, { maxRetry: 3 });
    const result = await startRetry();
    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  test("超过最大重试次数后失败", async () => {
    const error = new Error("test error");
    const mockFn = vi.fn().mockRejectedValue(error);
    const { startRetry } = usePromiseRetry(mockFn, { maxRetry: 2 });
    try {
      await startRetry();
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

  test("自定义重试条件", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const canRetry = vi.fn().mockReturnValue(false);
    const { startRetry } = usePromiseRetry(mockFn, { canRetry });
    try {
      await startRetry();
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

  test("带延迟的重试", async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("first error"))
      .mockResolvedValue("success");

    const startTime = Date.now();
    const { startRetry } = usePromiseRetry(mockFn, {
      maxRetry: 3,
      delay: 100,
    });
    const result = await startRetry();
    const endTime = Date.now();

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(2);
    // 大于等于100
    expect(endTime - startTime).toBeGreaterThanOrEqual(100);
  });

  test("动态延迟时间", async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("first error"))
      .mockResolvedValue("success");

    const delay = vi.fn().mockReturnValue(100);
    const { startRetry } = usePromiseRetry(mockFn, {
      maxRetry: 3,
      delay,
    });
    const result = await startRetry();

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledWith(
      { retryCount: 1, runTime: expect.any(Number) },
      expect.any(Error),
    );
  });

  test("最大运行时间限制", async () => {
    const mockFn = vi.fn().mockImplementation(() => {
      return new Promise<void>((resolve) => {
        setTimeout(resolve, 100);
      });
    });
    const { startRetry } = usePromiseRetry(mockFn, {
      maxRetry: 3,
      maxRunTime: 50,
    });
    try {
      await startRetry();
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
    const { startRetry } = usePromiseRetry(mockFn, {
      maxRetry: 20,
      maxErrorMessageListLength: 3,
    });
    try {
      await startRetry();
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).errorMessageList).toHaveLength(3);
    }
  });

  test("停止重试", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const { startRetry, stopRetry } = usePromiseRetry(mockFn, {
      maxRetry: 3,
      delay: 100,
    });

    const promise = startRetry();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
    stopRetry();

    try {
      await promise;
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).code).toBe(XPromiseErrorCodeEnum.ABORT);
    }
  });

  test("重试状态管理", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const { startRetry, getStatus, isRetrying } = usePromiseRetry(mockFn, {
      maxRetry: 3,
      delay: 100,
    });

    expect(getStatus()).toBe(XPromiseStateEnum.NOT_STARTED);
    expect(isRetrying()).toBe(false);

    const promise = startRetry();
    expect(getStatus()).toBe(XPromiseStateEnum.PENDING);
    expect(isRetrying()).toBe(true);

    try {
      await promise;
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
    }

    expect(getStatus()).toBe(XPromiseStateEnum.NOT_STARTED);
    expect(isRetrying()).toBe(false);
  });

  test("canRetry函数执行错误", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const canRetry = vi.fn().mockImplementation(() => {
      throw new Error("canRetry error");
    });
    const { startRetry } = usePromiseRetry(mockFn, { canRetry });
    try {
      await startRetry();
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).code).toBe(
        XPromiseErrorCodeEnum.RETRY_CAN_RETRY_FN_FAILED,
      );
    }
  });

  test("delay函数执行错误", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const delay = vi.fn().mockImplementation(() => {
      throw new Error("delay error");
    });
    const { startRetry } = usePromiseRetry(mockFn, { delay });
    try {
      await startRetry();
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).code).toBe(
        XPromiseErrorCodeEnum.RETRY_DELAY_FN_FAILED,
      );
    }
  });
});
