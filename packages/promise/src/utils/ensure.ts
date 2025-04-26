import { XPromiseError } from "@/error";
import { XPromiseErrorCodeEnum } from "./enums";

/** 确保 createPromise 流程正常 */
export const ensureCreatePromiseFlowNormal = <T>(
  createPromise: () => Promise<T>,
) => {
  try {
    return createPromise();
  } catch (error: any) {
    return new Promise<T>((_resolve, reject) => {
      reject(
        new XPromiseError(
          XPromiseErrorCodeEnum.CREATE_PROMISE_FAILED,
          error?.message || undefined,
        ),
      );
    });
  }
};
