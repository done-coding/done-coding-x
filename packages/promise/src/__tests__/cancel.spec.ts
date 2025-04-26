import { describe, test, expect } from "vitest";
import { XPromiseCancelError, XPromiseCancelToken } from "@/x-fn";
import { XPromiseErrorCodeEnum, XPromiseErrorCodeEnumMap } from "@/utils";

describe("cancel", () => {
  test("创建取消令牌并取消", () => {
    const abortFn = (message?: string) => {
      throw new XPromiseCancelError(message);
    };
    const token = XPromiseCancelToken.source(abortFn);

    expect(() => token.cancel()).toThrow(XPromiseCancelError);
    expect(() => token.cancel()).toThrow(
      XPromiseErrorCodeEnumMap[XPromiseErrorCodeEnum.ABORT],
    );
  });

  test("使用自定义消息取消", () => {
    const customMessage = "自定义取消消息";
    const abortFn = (message?: string) => {
      throw new XPromiseCancelError(message);
    };
    const token = XPromiseCancelToken.source(abortFn);

    expect(() => token.cancel(customMessage)).toThrow(XPromiseCancelError);
    expect(() => token.cancel(customMessage)).toThrow(customMessage);
  });

  test("检测取消错误", () => {
    const error = new XPromiseCancelError();
    expect(XPromiseCancelToken.isCancelError(error)).toBe(true);
    expect(XPromiseCancelToken.isCancelError(new Error())).toBe(false);
  });

  test("取消错误包含正确的错误代码", () => {
    const error = new XPromiseCancelError();
    expect(error.code).toBe(XPromiseErrorCodeEnum.ABORT);
  });
});
