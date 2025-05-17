# XPromise

XPromise 是一个基于原生 Promise 的功能扩展库，提供了一系列实用的异步编程增强功能，包括重试、轮询、共享、超时控制等特性，使异步操作更加可控和易用。

## 特性

- 🚀 基于原生 Promise，提供丰富的扩展功能
- 🔄 支持 Promise 重试机制，可配置重试次数和间隔
- 🔍 内置轮询功能，支持定期检查操作
- 🛡️ 无拒绝处理机制，优雅处理错误情况
- 🤝 Promise 共享功能，实现请求的并发控制
- ⏱️ 超时控制，避免操作无限等待
- ⏹️ 取消/中止功能，支持手动中断操作
- 📊 状态管理，实时监控操作状态
- ⚡ 动态延迟时间，支持自定义延迟策略

## 安装

```bash
npm install @done-coding/x-promise
# 或
yarn add @done-coding/x-promise
# 或
pnpm add @done-coding/x-promise
```

## API 一览

- `usePromiseRetry`：通用重试（支持状态管理、主动中止、动态延迟等）
- `usePromisePolling`：通用轮询（基于重试，API一致）
- `usePromiseSharing`：Promise 共享（并发控制、缓存）
- `promiseNoReject`：无拒绝处理
- `XPromiseCancelToken`：取消令牌
- 错误类型：`XPromiseError`、`XPromiseRetryError`、`XPromiseCancelError`

## 典型用法

### 1. 重试功能 usePromiseRetry

```typescript
import { usePromiseRetry } from "@done-coding/x-promise";

const { startRetry, stopRetry, getStatus, isRetrying } = usePromiseRetry(
  () => fetchData(),
  {
    maxRetry: 3,
    delay: 1000, // 支持 number 或 (info, err) => number
    maxRunTime: 5000, // 最大运行时间（可选）
    maxErrorMessageListLength: 5, // 错误消息列表最大长度（可选）
    canRetry: ({ retryCount, runTime }, err) =>
      retryCount < 3 && runTime < 5000,
  },
);

startRetry()
  .then(console.log)
  .catch((e) => {
    if (e.code === "RETRY_EXCEED_LIMIT") {
      // ...
    }
  });

// 主动中止
stopRetry();
console.log(getStatus()); // NOT_STARTED | PENDING
console.log(isRetrying()); // true/false
```

### 2. 轮询功能 usePromisePolling

```typescript
import { usePromisePolling } from "@done-coding/x-promise";

const { startPolling, stopPolling, getStatus, isPolling } = usePromisePolling(
  () => checkStatus(),
  {
    maxRetry: 10,
    delay: 2000,
  },
);

startPolling().then(console.log).catch(console.error);
stopPolling();
console.log(getStatus());
console.log(isPolling());
```

> **说明**：轮询本质上是基于重试的"直到成功"或"定期检查"，API与 usePromiseRetry 完全一致。

### 3. Promise 共享 usePromiseSharing

```typescript
import { usePromiseSharing } from "@done-coding/x-promise";

const { applyPromise, getStatus, clearPromise, isHasPromise } =
  usePromiseSharing(() => fetchData(), {
    rejectClean: true,
    resolveClean: false,
  });

applyPromise().then(console.log);
// 多次 applyPromise() 会共享同一个 Promise
// 可通过 clearPromise() 主动清理
```

**说明：**

- `rejectClean`：Promise 失败（reject）时是否自动清理共享实例。为 true 时，失败后下次 applyPromise() 会创建新 Promise。
- `resolveClean`：Promise 成功（resolve）时是否自动清理共享实例。为 true 时，成功后下次 applyPromise() 会创建新 Promise。
- 如果你需要强制刷新、组件卸载或主动重置时，请手动调用 `clearPromise()`。
- 当 `rejectClean` 或 `resolveClean` 为 false 时，务必在合适时机手动调用 `clearPromise()`，否则会一直复用旧的 Promise。

### 4. 无拒绝处理 promiseNoReject

```typescript
import { promiseNoReject } from "@done-coding/x-promise";

promiseNoReject(() => riskyOperation(), defaultValue).then((res) => {
  // 永远不会 reject
});
```

### 5. 取消令牌 XPromiseCancelToken

```typescript
import { XPromiseCancelToken } from "@done-coding/x-promise";

const cancelToken = XPromiseCancelToken.source((msg) => {
  // 这里实现具体的中止逻辑
});
cancelToken.cancel("用户取消");

// 判断是否为取消错误
if (XPromiseCancelToken.isCancelError(error)) {
  // ...
}
```

## 类型定义

```typescript
// 重试/轮询选项
export interface XPromiseRetryOptions {
  maxRetry?: number; // 最大重试次数，默认0
  maxRunTime?: number; // 最大运行时间，默认Infinity
  maxErrorMessageListLength?: number; // 错误消息列表最大长度，默认10
  canRetry?: (
    info: { retryCount: number; runTime: number },
    err?: any,
  ) => boolean;
  delay?:
    | number
    | ((info: { retryCount: number; runTime: number }, err?: any) => number);
}

export interface XPromisePollingOptions extends XPromiseRetryOptions {
  maxRetry: number; // 必填
}

// 共享选项
export interface XPromiseSharingOptions {
  rejectClean?: boolean; // reject时是否清理，默认true
  resolveClean?: boolean; // resolve时是否清理，默认true
}

// 状态枚举
export enum XPromiseStateEnum {
  NOT_STARTED = -1,
  PENDING = 0,
  FULFILLED = 1,
  REJECTED = 2,
}

// 错误码枚举
export enum XPromiseErrorCodeEnum {
  CREATE_PROMISE_FAILED = 1,
  TIMEOUT,
  ABORT,
  RETRY_EXCEED_LIMIT,
  RETRY_CAN_RETRY_FN_FAILED,
  RETRY_DELAY_FN_FAILED,
}
```

## 错误处理

- `XPromiseError`：基础错误类型，包含 code 字段
- `XPromiseRetryError`：重试/轮询失败错误，包含 code、retryCount、runTime、errorMessageList
- `XPromiseCancelError`：取消操作错误

### 错误码说明

| code                      | 含义                 |
| ------------------------- | -------------------- |
| CREATE_PROMISE_FAILED     | 创建Promise失败      |
| TIMEOUT                   | 超时                 |
| ABORT                     | 操作被中止           |
| RETRY_EXCEED_LIMIT        | 超过重试/轮询限制    |
| RETRY_CAN_RETRY_FN_FAILED | canRetry函数执行失败 |
| RETRY_DELAY_FN_FAILED     | delay函数执行失败    |

## 最佳实践

- 网络请求、数据库、文件等场景的失败重试
- 进度/状态轮询，定期检查直到成功
- 多组件/多次调用共享同一异步请求，避免重复
- 复杂异步流程的超时与中止
- 错误捕获与友好提示

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
