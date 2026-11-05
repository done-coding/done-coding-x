import { describe, test, expect, vi } from "vitest";
import { EventManager } from "@/manager";

describe("EventManager", () => {
  test("on / off 按事件类型触发并传递 detail", () => {
    const manager = EventManager.create();
    const listener = vi.fn();

    manager.on("change", listener);
    manager.trigger({ type: "change", detail: 1 });
    manager.off("change", listener);
    manager.trigger({ type: "change", detail: 2 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ type: "change", detail: 1 });
  });

  test("once 只执行一次，且可通过原函数提前取消", () => {
    const manager = EventManager.create();
    const listener = vi.fn();
    const canceled = vi.fn();

    manager.once("change", listener);
    manager.once("change", canceled);
    manager.off("change", canceled);
    manager.trigger({ type: "change" });
    manager.trigger({ type: "change" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(canceled).not.toHaveBeenCalled();
  });

  test("once 回调抛错后不会再次执行", () => {
    const onError = vi.fn();
    const manager = EventManager.create({ onError });
    const listener = vi.fn(() => {
      throw new Error("listener failed");
    });

    manager.once("change", listener);
    manager.trigger({ type: "change" });
    manager.trigger({ type: "change" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  test("once 回调内再次触发同一事件不会重复执行", () => {
    const manager = EventManager.create();
    const listener = vi.fn(() => {
      manager.trigger({ type: "change" });
    });

    manager.once("change", listener);
    manager.trigger({ type: "change" });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("同一函数同时注册 on 和 once 时，常驻监听不被误删", () => {
    const manager = EventManager.create();
    const listener = vi.fn();
    const counts: number[] = [];

    manager.on("change", listener);
    manager.once("change", listener);
    for (let i = 0; i < 3; i++) {
      listener.mockClear();
      manager.trigger({ type: "change" });
      counts.push(listener.mock.calls.length);
    }

    expect(counts).toEqual([2, 1, 1]);
  });

  test("派发中新增的监听器从下一次派发开始生效", () => {
    const manager = EventManager.create();
    const added = vi.fn();

    // 用常驻监听器：集合在派发中不会被删空，才能验证遍历的是快照
    manager.on("change", () => {
      manager.on("change", added);
    });
    manager.trigger({ type: "change" });
    expect(added).not.toHaveBeenCalled();

    manager.trigger({ type: "change" });
    expect(added).toHaveBeenCalledTimes(1);
  });

  test("派发中移除后重新注册的监听器从下一次派发开始生效", () => {
    const manager = EventManager.create();
    const calls: string[] = [];
    const reRegistered = () => calls.push("reRegistered");

    let shouldReRegister = true;

    // 用常驻监听器：集合在派发中不会被删空，才能区分旧注册和新注册
    manager.on("change", () => {
      calls.push("first");
      if (shouldReRegister) {
        shouldReRegister = false;
        manager.off("change", reRegistered);
        manager.on("change", reRegistered);
      }
    });
    manager.on("change", reRegistered);
    manager.trigger({ type: "change" });
    expect(calls).toEqual(["first"]);

    manager.trigger({ type: "change" });
    expect(calls).toEqual(["first", "first", "reRegistered"]);
  });

  test("派发中 clear 后，本次剩余的监听器不再执行", () => {
    const manager = EventManager.create();
    const remaining = vi.fn();

    manager.on("change", () => {
      manager.clear();
    });
    manager.on("change", remaining);
    manager.trigger({ type: "change" });

    expect(remaining).not.toHaveBeenCalled();
  });

  test("派发中重复注册未移除的监听器，本次仍正常执行", () => {
    const manager = EventManager.create();
    const listener = vi.fn();

    manager.on("change", () => {
      manager.on("change", listener);
    });
    manager.on("change", listener);
    manager.trigger({ type: "change" });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("派发中被移除的监听器本次不再执行", () => {
    const manager = EventManager.create();
    const removed = vi.fn();

    manager.on("change", () => {
      manager.off("change", removed);
    });
    manager.on("change", removed);
    manager.trigger({ type: "change" });

    expect(removed).not.toHaveBeenCalled();
  });

  test("未配置 onError 时输出错误，且不影响后续监听器", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const manager = EventManager.create();
    const next = vi.fn();
    const error = new Error("listener failed");

    manager.on("change", () => {
      throw error;
    });
    manager.on("change", next);
    manager.trigger({ type: "change" });

    expect(consoleError).toHaveBeenCalledWith(expect.any(String), error);
    expect(next).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});
