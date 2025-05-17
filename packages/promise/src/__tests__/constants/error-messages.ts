/**
 * 测试中使用的错误消息枚举
 */
export const TestErrorMessages = {
  // 轮询相关错误
  POLLING: {
    FIRST_ERROR: "first error",
    SECOND_ERROR: "second error",
    TEST_ERROR: "test error",
    DELAY_ERROR: "delay error",
    CAN_RETRY_ERROR: "canRetry error",
  },
  // 共享相关错误
  SHARING: {
    FIRST_ERROR: "first error",
    SYNC_ERROR: "sync error",
  },
  // 重试相关错误
  RETRY: {
    TEST_ERROR: "test error",
    DELAY_ERROR: "delay error",
    CAN_RETRY_ERROR: "canRetry error",
  },
  // 通用错误
  COMMON: {
    CREATE_PROMISE_FAILED: "sync error",
  },
} as const;
