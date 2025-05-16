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
  /** 中止 */
  ABORT,
  /** 重试超出限制 */
  RETRY_EXCEED_LIMIT,
  /** 重试判断是否可以重试函数执行失败 */
  RETRY_CAN_RETRY_FN_FAILED,
  /** 重试延迟函数执行失败 */
  RETRY_DELAY_FN_FAILED,
}

/** x promise状态枚举 */
export enum XPromiseStateEnum {
  /** 未开始 */
  NOT_STARTED = -1,
  /** 等待中 */
  PENDING = 0,
  /** 成功 */
  FULFILLED = 1,
  /** 失败 */
  REJECTED = 2,
}
