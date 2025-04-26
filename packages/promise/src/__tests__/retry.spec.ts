import { describe, test, expect, vi } from "vitest";
import { promiseRetry, XPromiseRetryError } from "@/x-fn";

describe("retry", () => {
  test("首次成功不需要重试", async () => {
    const mockFn = vi.fn().mockResolvedValue("success");
    const result = await promiseRetry(mockFn, { maxRetry: 3 });
    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("失败后重试成功", async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("first error"))
      .mockResolvedValue("success");
    const result = await promiseRetry(mockFn, { maxRetry: 3 });
    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  test("超过最大重试次数后失败", async () => {
    const error = new Error("test error");
    const mockFn = vi.fn().mockRejectedValue(error);
    try {
      await promiseRetry(mockFn, { maxRetry: 2 });
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).errorList).toHaveLength(3);
      expect((e as XPromiseRetryError).errorList[0]).toBe(error);
    }
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  test("自定义重试条件", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("test error"));
    const canRetry = vi.fn().mockReturnValue(false);
    try {
      await promiseRetry(mockFn, { canRetry });
    } catch (e) {
      expect(e).toBeInstanceOf(XPromiseRetryError);
      expect((e as XPromiseRetryError).errorList).toHaveLength(1);
    }
    expect(canRetry).toHaveBeenCalledWith(0);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("带延迟的重试", async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("first error"))
      .mockResolvedValue("success");

    const startTime = Date.now();
    const result = await promiseRetry(mockFn, {
      maxRetry: 3,
      delay: 100,
    });
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
    const result = await promiseRetry(mockFn, {
      maxRetry: 3,
      delay,
    });

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledWith(1);
  });
});
