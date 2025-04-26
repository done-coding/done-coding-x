/* eslint-disable max-nested-callbacks */
import { describe, test } from "vitest";
import { XPromise, XPromiseErrorCodeEnum } from "@/index";
import { XPromiseErrorCodeEnumMap } from "@/utils/resolve-enums";

const TIME_OUT = 20;

const CHANGE_TIME = 10;

/** 等待时间 */
const waitSomeTime = (time: number) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, time + 10);
  });
const FIRST_ERROR = `立即报错_${Math.random()}`;
const FIRST_REJECT = `立即REJECT_${Math.random()}`;
const FIRST_RESOLVE = `立即RESOLVE_${Math.random()}`;
const SECOND_ERROR = `${TIME_OUT}ms后报错_${Math.random()}`;
const SECOND_REJECT = `${TIME_OUT}ms后REJECT_${Math.random()}`;
const SECOND_RESOLVE = `${TIME_OUT}ms后RESOLVE_${Math.random()}`;

const getPromiseContext = (config: {
  firstError?: boolean;
  /**
   * !!!异步异常 这个不是本包需要或者能考虑的问题 这个是调用者的问题 不再测试这个 @deprecated
   * --
   * 但本包提供超时功能 某种程度避免僵尸promise的产生
   */
  secondError?: boolean;
  firstReject?: boolean;
  secondReject?: boolean;
  firstResolve?: boolean;
  secondResolve?: boolean;
}) => {
  const keys = Object.keys(config);
  if (keys.length === 0) {
    throw new Error("必须配置一个状态");
  }

  const {
    firstError,
    secondError,
    firstReject,
    secondReject,
    firstResolve,
    secondResolve,
  } = config;

  const mockThrowErrorFn = vi.fn((message: string) => {
    throw new Error(message);
  });

  const promise = new XPromise<string>((resolve, reject) => {
    if (firstError) {
      return mockThrowErrorFn(FIRST_ERROR);
    } else if (firstReject) {
      return reject(new Error(FIRST_REJECT));
    } else if (firstResolve) {
      return resolve(FIRST_RESOLVE);
    }
    setTimeout(() => {
      if (secondError) {
        try {
          return mockThrowErrorFn(SECOND_ERROR);
        } catch (error) {
          /**
           * !!! 此处其实不用catch 但是因为测试异常，阻止了resolve/reject 形成僵尸promise
           * !!! 此处是其实已经测试完成 reject一下 也不用测试这一步
           */
          setTimeout(() => {
            reject(error);
          }, CHANGE_TIME + 10);
        }
      } else if (secondReject) {
        return reject(new Error(SECOND_REJECT));
      } else if (secondResolve) {
        return resolve(SECOND_RESOLVE);
      }
    }, TIME_OUT);
  });

  return {
    promise,
    mockThrowErrorFn,
  };
};

describe("timeout", () => {
  describe(FIRST_ERROR, () => {
    test("未到超时时间 直接报错1", async () => {
      const { promise, mockThrowErrorFn } = getPromiseContext({
        firstError: true,
      });

      try {
        await promise.timeout(TIME_OUT - CHANGE_TIME);
      } catch (error: any) {
        expect(error.message).toBe(FIRST_ERROR);
      }
      expect(mockThrowErrorFn).toHaveBeenCalledWith(FIRST_ERROR);
    });
    test("未到超时时间 直接报错2", async () => {
      const { promise, mockThrowErrorFn } = getPromiseContext({
        firstError: true,
      });
      try {
        await promise.timeout(0);
      } catch (error: any) {
        expect(error.message).toBe(FIRST_ERROR);
      }
      expect(mockThrowErrorFn).toHaveBeenCalledWith(FIRST_ERROR);
    });
  });
  describe(FIRST_REJECT, () => {
    test("未到超时时间 直接REJECT1", async () => {
      const { promise } = getPromiseContext({
        firstReject: true,
      });
      try {
        await promise.timeout(TIME_OUT - CHANGE_TIME);
      } catch (error: any) {
        expect(error.message).toBe(FIRST_REJECT);
      }
    });
    test("未到超时时间 直接REJECT2", async () => {
      const { promise } = getPromiseContext({
        firstReject: true,
      });
      try {
        await promise.timeout(0);
      } catch (error: any) {
        expect(error.message).toBe(FIRST_REJECT);
      }
    });
  });
  describe(FIRST_RESOLVE, () => {
    test("超时", async () => {
      const { promise } = getPromiseContext({
        firstResolve: true,
      });
      const result = await promise.timeout(TIME_OUT);
      expect(result).toBe(FIRST_RESOLVE);
    });
    test("未超时", async () => {
      const { promise } = getPromiseContext({
        firstResolve: true,
      });
      const result = await promise.timeout(TIME_OUT - CHANGE_TIME);
      expect(result).toBe(FIRST_RESOLVE);
    });
  });
  describe(SECOND_ERROR, () => {
    test("先于超时报错(虽然先报错 但没有调用reject 最终触发的还是超时)", async () => {
      const { promise, mockThrowErrorFn } = getPromiseContext({
        secondError: true,
      });

      try {
        await promise.timeout(TIME_OUT + CHANGE_TIME);
      } catch (error: any) {
        // expect(error.message).toBe(SECOND_ERROR);
        expect(error.code).toBe(XPromiseErrorCodeEnum.TIMEOUT);
        expect(error.message).toBe(
          XPromiseErrorCodeEnumMap[XPromiseErrorCodeEnum.TIMEOUT],
        );
      }
      expect(mockThrowErrorFn).toHaveBeenCalledWith(SECOND_ERROR);
    });
    test("虽然报错 但先超时", async () => {
      const { promise, mockThrowErrorFn } = getPromiseContext({
        secondError: true,
      });
      try {
        await promise.timeout(TIME_OUT - CHANGE_TIME);
      } catch (error: any) {
        expect(error.code).toBe(XPromiseErrorCodeEnum.TIMEOUT);
        expect(error.message).toBe(
          XPromiseErrorCodeEnumMap[XPromiseErrorCodeEnum.TIMEOUT],
        );
      }
      expect(mockThrowErrorFn).toBeCalledTimes(0);
      await waitSomeTime(CHANGE_TIME);
      expect(mockThrowErrorFn).toHaveBeenCalledWith(SECOND_ERROR);
    });
  });
  describe(SECOND_REJECT, () => {
    test("先于超时REJECT", async () => {
      const { promise } = getPromiseContext({
        secondReject: true,
      });
      try {
        await promise.timeout(TIME_OUT + CHANGE_TIME);
      } catch (error: any) {
        expect(error.message).toBe(SECOND_REJECT);
      }
    });
    test("虽然REJECT 但先超时", async () => {
      const { promise } = getPromiseContext({
        secondReject: true,
      });
      try {
        await promise.timeout(TIME_OUT - CHANGE_TIME);
      } catch (error: any) {
        expect(error.code).toBe(XPromiseErrorCodeEnum.TIMEOUT);
        expect(error.message).toBe(
          XPromiseErrorCodeEnumMap[XPromiseErrorCodeEnum.TIMEOUT],
        );
      }
    });
  });
  describe(SECOND_RESOLVE, () => {
    test("先于超时RESOLVE", async () => {
      const { promise } = getPromiseContext({
        secondResolve: true,
      });
      const result = await promise.timeout(TIME_OUT + CHANGE_TIME);
      expect(result).toBe(SECOND_RESOLVE);
    });
    test("虽然RESOLVE 但先超时", async () => {
      const { promise } = getPromiseContext({
        secondResolve: true,
      });
      try {
        await promise.timeout(TIME_OUT - CHANGE_TIME);
      } catch (error: any) {
        expect(error.code).toBe(XPromiseErrorCodeEnum.TIMEOUT);
        expect(error.message).toBe(
          XPromiseErrorCodeEnumMap[XPromiseErrorCodeEnum.TIMEOUT],
        );
      }
    });
  });
  describe("边界情况测试", () => {
    test("设置负数超时时间应该立即超时", async () => {
      const { promise } = getPromiseContext({
        secondResolve: true,
      });
      try {
        await promise.timeout(-1);
      } catch (error: any) {
        expect(error.code).toBe(XPromiseErrorCodeEnum.TIMEOUT);
        expect(error.message).toBe(
          XPromiseErrorCodeEnumMap[XPromiseErrorCodeEnum.TIMEOUT],
        );
      }
    });
    test("多次设置超时时间应该以最后一次为准", async () => {
      const { promise } = getPromiseContext({
        secondResolve: true,
      });
      const result = await promise
        .timeout(TIME_OUT - CHANGE_TIME)
        .timeout(TIME_OUT + CHANGE_TIME);
      expect(result).toBe(SECOND_RESOLVE);
    });
    test("Promise已完成后设置超时应该无效", async () => {
      const { promise } = getPromiseContext({
        firstResolve: true,
      });
      const result = await promise.timeout(TIME_OUT);
      expect(result).toBe(FIRST_RESOLVE);
    });
  });
  describe("Promise内部异常", () => {
    test("Promise创建前就发生异常", async () => {
      const promise = new XPromise<string>(() => {
        // 在Promise创建过程中就发生异常
        const obj: any = undefined;
        return obj.nonExistentProperty;
      });

      try {
        await promise.timeout(TIME_OUT);
      } catch (error: any) {
        // 这里应该捕获到TypeError，而不是超时错误
        expect(error).toBeInstanceOf(TypeError);
        expect(error.message).toContain("Cannot read properties of undefined");
      }
    });

    test("Promise创建后但在resolve/reject前发生异常", async () => {
      const promise = new XPromise<string>((resolve, reject) => {
        // 创建一个Promise但不立即resolve
        setTimeout(() => {
          // 在setTimeout中发生异常
          const obj: any = undefined;
          try {
            // 尝试访问undefined的属性，这会抛出TypeError
            const value = obj.nonExistentProperty;
            resolve(value);
          } catch (error) {
            // 捕获异常并通过reject传递
            reject(error);
          }
        }, TIME_OUT / 2);
      });

      try {
        await promise.timeout(TIME_OUT);
      } catch (error: any) {
        // 这里应该捕获到TypeError，而不是超时错误
        expect(error).toBeInstanceOf(TypeError);
        expect(error.message).toContain("Cannot read properties of undefined");
      }
    });

    test("Promise创建后但在resolve/reject前发生异常，但超时先发生", async () => {
      const promise = new XPromise<string>((resolve) => {
        // 创建一个Promise但不立即resolve
        setTimeout(() => {
          // 在setTimeout中发生异常，但此时Promise可能已经超时
          const obj: any = undefined;
          resolve(obj.nonExistentProperty);
        }, TIME_OUT + CHANGE_TIME);
      });

      try {
        await promise.timeout(TIME_OUT);
      } catch (error: any) {
        // 这里应该捕获到超时错误，因为超时先发生
        expect(error.code).toBe(XPromiseErrorCodeEnum.TIMEOUT);
        expect(error.message).toBe(
          XPromiseErrorCodeEnumMap[XPromiseErrorCodeEnum.TIMEOUT],
        );
      }
    });
  });
});
