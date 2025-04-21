/** x promise错误码枚举 */
export enum XPromiseErrorCodeEnum {
  /** 超时 */
  TIMEOUT = 1,
  /** 中止 */
  ABORT = 2,
}

/** x promise状态枚举 */
export enum XPromiseStateEnum {
  /** 等待中 */
  PENDING = 0,
  /** 成功 */
  FULFILLED = 1,
  /** 失败 */
  REJECTED = 2,
}
