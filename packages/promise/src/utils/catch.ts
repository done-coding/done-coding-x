/**
 * 捕捉函数执行过程错误
 * ---
 * 异步成功创建的失败不在本函数捕捉范围
 */
export const catchFnExecError = <R>(
  /** 执行函数 */
  fn: () => R,
  /** 错误处理函数 */
  errorHandler: (error: any) => R,
): R => {
  try {
    return fn();
  } catch (error) {
    return errorHandler(error);
  }
};
