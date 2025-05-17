import type { XPromiseErrorCodeEnum } from "./enums";
import { XPromiseErrorCodeEnumMap } from "./resolve-enums";
/** XPromiseError class */
export class XPromiseError extends Error {
  public constructor(
    public code: XPromiseErrorCodeEnum,
    message: string = XPromiseErrorCodeEnumMap[code],
  ) {
    super(message);
  }
}
