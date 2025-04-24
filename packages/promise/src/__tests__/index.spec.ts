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
  secondError?: boolean;
  firstReject?: boolean;
  secondReject?: boolean;
  firstResolve?: boolean;
  secondResolve?: boolean;
  mockThrowErrorFnInner?: (message: string) => void;
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
    mockThrowErrorFnInner,
  } = config;

  const mockThrowErrorFn = vi.fn(
    mockThrowErrorFnInner ||
      ((message: string) => {
        console.log(new Error(message));
      }),
  );

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
        return mockThrowErrorFn(SECOND_ERROR);
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
        mockThrowErrorFnInner: (message: string) => {
          throw new Error(message);
        },
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
        mockThrowErrorFnInner: (message: string) => {
          throw new Error(message);
        },
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
        mockThrowErrorFnInner: (message: string) => {
          throw new Error(message);
        },
      });

      try {
        await promise.timeout(TIME_OUT + CHANGE_TIME);
      } catch (error: any) {
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
        mockThrowErrorFnInner: (message: string) => {
          throw new Error(message);
        },
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
});
