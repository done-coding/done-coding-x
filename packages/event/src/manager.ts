/** 事件监听器选项 */
export interface AddEventListenerOptions {
  /** 是否只执行一次 */
  once?: boolean;
}

/** 事件类型 */
export type EventType = string | symbol | number;

/** 触发事件参数 */
export interface DispatchEventParams {
  type: EventType;
  detail?: unknown;
}

/** 事件监听器函数类型 */
export type EventListener = (event: DispatchEventParams) => void;

/** 一次性事件监听包装器 */
export type OnceFn = EventListener & {
  _raw?: EventListener;
};

/** 事件管理器选项 */
export interface EventManagerOptions {
  onError?: (params: {
    eventParams: DispatchEventParams;
    listener: EventListener;
    error: any;
  }) => void;
}

/** 事件管理 */
export class EventManager {
  public static create(options?: EventManagerOptions) {
    return new this(options);
  }

  /** 事件列表：监听器 -> 注册序号，序号用于区分移除后重新注册的同一函数 */
  private eventMap: Map<EventType, Map<OnceFn, number>> = new Map();

  /** 下一个注册序号 */
  private nextRegistrationId = 0;

  private constructor(private options?: EventManagerOptions) {}

  /**
   * 移除事件监听器
   */
  public removeEventListener(type: EventType, listener: EventListener) {
    if (!this.checkEventTypes(type)) {
      throw new Error("Invalid event type");
    }
    if (typeof listener !== "function") {
      throw new Error("Invalid listener");
    }
    const listeners = this.eventMap.get(type);
    if (listeners) {
      if (listeners.has(listener as OnceFn)) {
        listeners.delete(listener as OnceFn);
      } else {
        for (const item of listeners.keys()) {
          if (item._raw === listener) {
            listeners.delete(item);
            break;
          }
        }
      }
      if (listeners.size === 0) {
        this.eventMap.delete(type);
      }
    }
  }

  /**
   * 添加事件监听器
   */
  public addEventListener(
    type: EventType,
    listener: EventListener,
    options: AddEventListenerOptions = {},
  ) {
    if (!this.checkEventTypes(type)) {
      throw new Error("Invalid event type");
    }
    if (typeof listener !== "function") {
      throw new Error("Invalid listener");
    }
    let listenerFinal = listener as OnceFn;
    if (options.once) {
      const onceListener: OnceFn = Object.assign(
        (eventParams: DispatchEventParams) => {
          // 先移除包装函数：回调抛错或重入触发都不再执行，也不影响同一函数的常驻监听
          this.removeEventListener(type, onceListener);
          listener(eventParams);
        },
        {
          /** 原始监听函数 */
          _raw: listener,
        },
      );
      listenerFinal = onceListener;
    }
    const targetListeners = this.eventMap.get(type) ?? new Map();
    this.eventMap.set(type, targetListeners);
    if (!targetListeners.has(listenerFinal)) {
      targetListeners.set(listenerFinal, this.nextRegistrationId++);
    }
  }

  /** 触发事件 */
  public dispatchEvent(eventParams: DispatchEventParams) {
    const { type, detail } = eventParams;
    const listeners = this.eventMap.get(type);
    if (listeners) {
      // 遍历快照：派发中新增的监听器下次生效，派发中移除的监听器本次不再执行
      [...listeners].forEach(([listener, registrationId]) => {
        // 序号不同说明本次派发中被移除后又重新注册，也按新增处理
        if (listeners.get(listener) !== registrationId) {
          return;
        }
        try {
          listener({ type, detail });
        } catch (error) {
          if (this.options?.onError) {
            this.options.onError({ eventParams, listener, error });
          } else {
            console.error("EventManager: 事件监听器执行失败", error);
          }
        }
      });
    }
  }

  /** 添加事件监听器 */
  public on = (
    type: EventType,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ) => {
    return this.addEventListener(type, listener, options);
  };

  /** 移除事件监听器 */
  public off = (type: EventType, listener: EventListener) => {
    return this.removeEventListener(type, listener);
  };

  /** 添加一次性事件监听器 */
  public once = (
    type: EventType,
    listener: EventListener,
    options: Omit<AddEventListenerOptions, "once"> = {},
  ) => {
    return this.addEventListener(type, listener, { once: true, ...options });
  };

  /** 触发事件 */
  public trigger = (eventParams: DispatchEventParams) => {
    return this.dispatchEvent(eventParams);
  };

  /** 清空事件 */
  public clear = () => {
    // 同时清空内层：进行中的派发持有内层引用，本次剩余的监听器也不再执行
    this.eventMap.forEach((listeners) => listeners.clear());
    this.eventMap.clear();
  };
  /** 检查事件类型 */
  private checkEventTypes(type: EventType) {
    const eventType = typeof type;
    return ["string", "symbol", "number"].includes(eventType);
  }
}
