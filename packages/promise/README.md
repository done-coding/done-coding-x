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

## 安装

```bash
npm install @done-coding/x-promise
# 或
yarn add @done-coding/x-promise
# 或
pnpm add @done-coding/x-promise
```

## 使用示例

### 1. 重试功能

```typescript
import { XPromise } from "@done-coding/x-promise";

// 基础重试
XPromise.retry(() => fetchData(), { maxRetry: 3, delay: 1000 });

// 自定义重试条件
XPromise.retry(() => fetchData(), {
  maxRetry: 5,
  canRetry: (retryCount) => retryCount < 3 || someCondition,
  delay: (retryCount) => retryCount * 1000, // 递增延迟
});

// 可取消的重试
const cancelToken = XPromiseCancelToken.source();
XPromise.retry(() => fetchData(), {
  maxRetry: 5,
  delay: 1000,
  cancelToken, // 传入取消令牌
});

// 取消重试
cancelToken.cancel("用户取消重试");
```

### 2. 轮询功能

```typescript
// 基于重试的轮询（直到成功）
XPromise.polling(() => checkStatus(), {
  maxRetry: 10,
  delay: 2000, // 每2秒检查一次
});
```

### 3. 无拒绝处理

```typescript
// 确保 Promise 永远不会 reject
XPromise.noReject(
  () => riskyOperation(),
  () => defaultValue, // 发生错误时返回默认值
);

// 使用静态默认值
XPromise.noReject(() => riskyOperation(), defaultValue);
```

### 4. Promise 共享

```typescript
const { applyPromise } = XPromise.useSharing(() => fetchData());

// 在Promise完成前，所有调用都会共享同一个Promise实例
applyPromise().then(console.log); // 共享同一个Promise
applyPromise().then(console.log); // 共享同一个Promise

// 如果Promise失败，内部会自动重置，下次调用会创建新的Promise
applyPromise().catch((error) => {
  console.error(error);
  // 此时再次调用applyPromise()会创建新的Promise
});

// 如果Promise成功，共享会持续存在
// 后续的调用都会得到已经完成的Promise结果
setTimeout(() => {
  applyPromise().then(console.log); // 直接得到之前成功的结果
}, 1000);

// 如果需要重新发起请求，需要创建新的共享实例
const { applyPromise: applyNewPromise } = XPromise.useSharing(() =>
  fetchData(),
);
```

Promise共享机制说明：

- 在Promise处于pending状态时，所有调用`applyPromise()`都会共享同一个Promise实例
- 如果Promise失败（reject），内部会自动重置共享状态，下次调用会创建新的Promise
- 如果Promise成功（resolve），共享状态会持续存在，后续调用都会直接得到已成功的结果
- 如果需要重新发起请求，需要调用`XPromise.useSharing()`创建新的共享实例
- 主要用于避免在Promise完成前重复创建相同的Promise，实现请求的并发控制

### 5. 超时和取消控制

```typescript
const promise = new XPromise((resolve) => {
  // 异步操作
})
  .timeout(5000) // 5秒超时
  .abort("用户取消"); // 手动取消

// 判断是否是取消错误
if (XPromise.isCancelError(error)) {
  console.log("操作被取消");
}
```

## API 文档

### XPromise 类

#### 静态方法

- `retry<T>(createPromise: () => Promise<T>, options: XPromiseRetryOptions): Promise<T>`
- `polling<T>(createPromise: () => Promise<T>, options: XPromisePollingOptions): Promise<T>`
- `noReject<T>(createPromise: () => Promise<T>, defaultValue: T | (() => T)): Promise<T>`
- `useSharing<T>(createPromise: () => Promise<T>): { applyPromise: () => Promise<T> }`
- `isCancelError(error: unknown): boolean`
- `isTimeoutError(error: unknown): boolean`

#### 实例方法

- `timeout(time: number): XPromise<T>`
- `abort(message?: string): void`

### 类型定义

```typescript
interface XPromiseRetryOptions {
  maxRetry?: number;
  canRetry?: (retryCount: number) => boolean;
  delay?: ((retryCount: number) => number) | number;
}

interface XPromisePollingOptions {
  maxRetry: number;
  delay?: ((retryCount: number) => number) | number;
}
```

## 错误处理

XPromise 提供了多种错误类型：

- `XPromiseError`: 基础错误类
- `XPromiseRetryError`: 重试失败错误
- `XPromiseCancelError`: 取消操作错误
- `XPromiseTimeoutError`: 超时错误

## 最佳实践

1. **重试场景**

   - 网络请求失败重试
   - 数据库操作重试
   - 文件操作重试

2. **轮询场景**

   - 状态检查
   - 进度监控
   - 数据同步

3. **共享场景**

   - 多个组件共享同一个数据请求
   - 避免重复请求
   - 缓存管理

4. **超时控制**
   - 长时间运行的操作
   - 网络请求超时
   - 资源加载超时

## 功能规划

### 1. 重试及轮询的取消功能

计划为重试和轮询功能添加取消机制，使用`XPromiseCancelToken`实现，让用户可以在任何时候取消正在进行的重试或轮询操作。

### 2. 轮询功能增强

计划增加新的轮询模式，支持不以成功为标准的定期轮询，可以设置固定的轮询次数和间隔时间，无论成功失败都会继续执行。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT

```

```
