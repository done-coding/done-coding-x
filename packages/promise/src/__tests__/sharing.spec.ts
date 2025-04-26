import { describe, test, expect, vi } from "vitest";
import { usePromiseSharing } from "@/x-fn";

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
      .mockRejectedValueOnce(new Error("first error"))
      .mockResolvedValue("success");
    const { applyPromise } = usePromiseSharing(mockFn);

    const promise1 = applyPromise();
    try {
      await promise1;
    } catch (error: unknown) {
      if (error instanceof Error) {
        expect(error.message).toBe("first error");
      }
    }

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
        throw new Error("sync error");
      }
      return Promise.resolve("success");
    });

    const { applyPromise } = usePromiseSharing(mockFn);

    try {
      await applyPromise();
    } catch (error: unknown) {
      if (error instanceof Error) {
        expect(error.message).toBe("sync error");
      }
    }

    const result = await applyPromise();
    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});
