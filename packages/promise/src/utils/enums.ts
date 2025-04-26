/** x promise错误码枚举 */
export enum XPromiseErrorCodeEnum {
  /**
   * 创建promise失败
   * ----
   * 比如 返回一个promise 但在返回之前出现了异常
   */
  CREATE_PROMISE_FAILED = 1,
  /** 超时 */
  TIMEOUT,
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
