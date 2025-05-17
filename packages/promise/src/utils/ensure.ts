import { XPromiseError } from "./error";
import { XPromiseErrorCodeEnum } from "./enums";
import { catchFnExecError } from "./catch";

/**
 * 确保 createPromise 流程正常
 * ---
 * 异步成功创建的失败不在本函数捕捉范围
 */
export const ensureCreatePromiseFlowNormal = <T>(
  createPromise: () => Promise<T>,
) => {
  return catchFnExecError(createPromise, (error) => {
    return new Promise<T>((_resolve, reject) => {
      reject(
        new XPromiseError(
          XPromiseErrorCodeEnum.CREATE_PROMISE_FAILED,
          error?.message || undefined,
        ),
      );
    });
  });
};
