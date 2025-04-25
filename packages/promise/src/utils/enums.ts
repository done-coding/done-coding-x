/** x promise错误码枚举 */
export enum XPromiseErrorCodeEnum {
  /** 超时 */
  TIMEOUT = 1,
  /** 最大重试次数失败 */
  MAX_RETRY_FAILED,
  /** 中止 */
  ABORT,
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
