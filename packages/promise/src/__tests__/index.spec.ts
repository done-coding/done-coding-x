import { describe, test } from "vitest";
import { XPromise, XPromiseErrorCodeEnum } from "@/index";
import { XPromiseErrorCodeEnumMap } from "@/utils/resolve-enums";

const TIME_OUT = 3000;

const CHANGE_TIME = 1000;

const FIRST_ERROR = `立即报错_${Math.random()}`;
const FIRST_REJECT = `立即REJECT_${Math.random()}`;
const FIRST_RESOLVE = `立即RESOLVE_${Math.random()}`;
const SECOND_ERROR = `${TIME_OUT}ms后报错_${Math.random()}`;
const SECOND_REJECT = `${TIME_OUT}ms后REJECT_${Math.random()}`;
const SECOND_RESOLVE = `${TIME_OUT}ms后RESOLVE_${Math.random()}`;

const getPromise = (config: {
  firstError?: boolean;
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

  return new XPromise<string>((resolve, reject) => {
    if (firstError) {
      throw new Error(FIRST_ERROR);
    } else if (firstReject) {
      return reject(new Error(FIRST_REJECT));
    } else if (firstResolve) {
      return resolve(FIRST_RESOLVE);
    }
    setTimeout(() => {
      if (secondError) {
        console.log(48, "secondError");
        throw new Error(SECOND_ERROR);
      } else if (secondReject) {
        return reject(new Error(SECOND_REJECT));
      } else if (secondResolve) {
        return resolve(SECOND_RESOLVE);
      }
    }, TIME_OUT);
  });
};

describe("timeout", () => {
  describe.skip(FIRST_ERROR, () => {
    test("未到超时时间 直接报错1", async () => {
      const promise = getPromise({ firstError: true });
      try {
        await promise.timeout(TIME_OUT - CHANGE_TIME);
      } catch (error: any) {
        expect(error.message).toBe(FIRST_ERROR);
      }
    });
    test("未到超时时间 直接报错2", async () => {
      const promise = getPromise({ firstError: true });
      try {
        await promise.timeout(0);
      } catch (error: any) {
        expect(error.message).toBe(FIRST_ERROR);
      }
    });
  });
  describe.skip(FIRST_REJECT, () => {
    test("未到超时时间 直接REJECT1", async () => {
      const promise = getPromise({ firstReject: true });
      try {
        await promise.timeout(TIME_OUT - CHANGE_TIME);
      } catch (error: any) {
        expect(error.message).toBe(FIRST_REJECT);
      }
    });
    test("未到超时时间 直接REJECT2", async () => {
      const promise = getPromise({ firstReject: true });
      try {
        await promise.timeout(0);
      } catch (error: any) {
        expect(error.message).toBe(FIRST_REJECT);
      }
    });
  });
  describe.skip(FIRST_RESOLVE, () => {
    test("超时", async () => {
      const promise = getPromise({ firstResolve: true });
      const result = await promise.timeout(TIME_OUT);
      expect(result).toBe(FIRST_RESOLVE);
    });
    test("未超时", async () => {
      const promise = getPromise({ firstResolve: true });
      const result = await promise.timeout(TIME_OUT - CHANGE_TIME);
      expect(result).toBe(FIRST_RESOLVE);
    });
  });
  describe(SECOND_ERROR, () => {
    test("先于超时报错", async () => {
      const promise = getPromise({ secondError: true });
      try {
        const result = await promise.timeout(TIME_OUT + CHANGE_TIME);
        console.log(111, result);
      } catch (error: any) {
        console.log(113, error.message);
        expect(error.message).toBe(SECOND_ERROR);
      }
    });
    test.skip("虽然报错 但先超时", async () => {
      const promise = getPromise({ secondError: true });
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
  describe.skip(SECOND_REJECT, () => {
    test("先于超时REJECT", async () => {
      const promise = getPromise({ secondReject: true });
      try {
        await promise.timeout(TIME_OUT + CHANGE_TIME);
      } catch (error: any) {
        expect(error.message).toBe(SECOND_REJECT);
      }
    });
    test("虽然REJECT 但先超时", async () => {
      const promise = getPromise({ secondReject: true });
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
  describe.skip(SECOND_RESOLVE, () => {
    test("先于超时RESOLVE", async () => {
      const promise = getPromise({ secondResolve: true });
      const result = await promise.timeout(TIME_OUT + CHANGE_TIME);
      expect(result).toBe(SECOND_RESOLVE);
    });
    test("虽然RESOLVE 但先超时", async () => {
      const promise = getPromise({ secondResolve: true });
      const result = await promise.timeout(TIME_OUT - CHANGE_TIME);
      expect(result).toBe(SECOND_RESOLVE);
    });
  });
});
