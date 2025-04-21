import type { XPromiseErrorCodeEnum } from "@/utils";
import { XPromiseErrorCodeEnumMap } from "@/utils";

/** XPromiseError class */
export class XPromiseError extends Error {
  public constructor(
    public code: XPromiseErrorCodeEnum,
    message: string = XPromiseErrorCodeEnumMap[code],
  ) {
    super(message);
  }
}
