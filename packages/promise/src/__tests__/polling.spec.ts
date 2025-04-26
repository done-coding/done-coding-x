import { describe, test, expect, vi } from "vitest";
import { promisePolling, XPromiseRetryError } from "@/x-fn";

describe("polling", () => {
  test("轮询直到成功", async () => {
    let count = 0;
    const mockFn = vi.fn().mockImplementation(() => {
      count++;
      if (count < 3) {
        return Promise.reject(new Error(`attempt ${count}`));
      }
      return Promise.resolve("success");
    });

    const result = await promisePolling(mockFn, {
      maxRetry: 3,
      delay: 100,
    });

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  test("达到最大轮询次数后失败", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));

    try {
      await promisePolling(mockFn, {
        maxRetry: 2,
        delay: 100,
      });
      // 确保代码不会执行到这里
      expect(true).toBe(false);
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(XPromiseRetryError);
      if (error instanceof XPromiseRetryError) {
        // maxRetry = 2 意味着执行 3 次（初始执行 + 2次重试）
        expect(error.errorList).toHaveLength(3);
        expect(mockFn).toHaveBeenCalledTimes(3);
      }
    }
  });

  test("动态延迟时间", async () => {
    let count = 0;
    const mockFn = vi.fn().mockImplementation(() => {
      count++;
      if (count < 2) {
        return Promise.reject(new Error(`attempt ${count}`));
      }
      return Promise.resolve("success");
    });

    const delay = vi.fn((retryCount: number) => retryCount * 100);
    const startTime = Date.now();

    const result = await promisePolling(mockFn, {
      maxRetry: 3,
      delay,
    });
    const endTime = Date.now();

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledWith(1);
    expect(endTime - startTime).toBeGreaterThanOrEqual(100);
  });
});
