import { TestErrorMessages } from "./constants/error-messages";
import { XPromiseError } from "../utils/error";

// 检查错误消息是否在预期的测试错误列表中
const isExpectedTestError = (error: Error): boolean => {
  // 检查是否是 XPromiseError 类型（包括其子类）
  if (error instanceof XPromiseError) {
    return true;
  }

  // 检查其他普通错误消息
  const errorMessages = Object.values(TestErrorMessages).flatMap((category) =>
    Object.values(category),
  );
  return errorMessages.some((message) => error.message === message);
};

// 全局处理未捕获的 Promise 拒绝
process.on("unhandledRejection", (reason) => {
  // 忽略测试中的预期拒绝
  if (reason instanceof Error && isExpectedTestError(reason)) {
    return;
  }
  // 其他未处理的拒绝仍然会抛出
  throw reason;
});

// 全局处理未捕获的异常
process.on("uncaughtException", (error) => {
  // 忽略测试中的预期异常
  if (error instanceof Error && isExpectedTestError(error)) {
    return;
  }
  // 其他未捕获的异常仍然会抛出
  throw error;
});
