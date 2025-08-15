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
  detail: unknown;
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

  /** 事件列表 */
  private eventMap: Map<EventType, Set<OnceFn>> = new Map();

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
        for (const item of listeners) {
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
      const onceListener = Object.assign(
        (eventParams: DispatchEventParams) => {
          listener(eventParams);
          this.removeEventListener(type, listener);
        },
        {
          /** 原始监听函数 */
          _raw: listener,
        },
      );
      listenerFinal = onceListener;
    }
    const targetListeners = this.eventMap.get(type);
    if (!targetListeners) {
      this.eventMap.set(type, new Set([listenerFinal]));
    } else {
      targetListeners.add(listenerFinal);
    }
  }

  /** 触发事件 */
  public dispatchEvent(eventParams: DispatchEventParams) {
    const { type, detail } = eventParams;
    const listeners = this.eventMap.get(type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener({ type, detail });
        } catch (error) {
          this.options?.onError?.({ eventParams, listener, error });
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
    this.eventMap.clear();
  };
  /** 检查事件类型 */
  private checkEventTypes(type: EventType) {
    const eventType = typeof type;
    return ["string", "symbol", "number"].includes(eventType);
  }
}
