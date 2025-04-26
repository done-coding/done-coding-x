import { describe, test, expect } from "vitest";
import { promiseNoReject } from "@/x-fn";

describe("noReject", () => {
  test("成功时返回正常值", async () => {
    const successValue = "success";
    const result = await promiseNoReject(
      () => Promise.resolve(successValue),
      "default",
    );
    expect(result).toBe(successValue);
  });

  test("失败时返回默认值（静态值）", async () => {
    const defaultValue = "default";
    const result = await promiseNoReject(
      () => Promise.reject(new Error("error")),
      defaultValue,
    );
    expect(result).toBe(defaultValue);
  });

  test("失败时返回默认值（函数返回值）", async () => {
    const defaultValue = "default";
    const result = await promiseNoReject(
      () => Promise.reject(new Error("error")),
      () => defaultValue,
    );
    expect(result).toBe(defaultValue);
  });

  test("同步错误时返回默认值", async () => {
    const defaultValue = "default";
    const result = await promiseNoReject(() => {
      throw new Error("error");
    }, defaultValue);
    expect(result).toBe(defaultValue);
  });
});
