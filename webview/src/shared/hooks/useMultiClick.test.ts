import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MULTI_CLICK_THRESHOLD, useMultiClick } from "./useMultiClick";

type TestEvent = React.MouseEvent & { detail: number };

function makeEvent(detail: number): TestEvent {
  return { detail } as TestEvent;
}

function setup(threshold = MULTI_CLICK_THRESHOLD) {
  const single = vi.fn();
  const double = vi.fn();
  const triple = vi.fn();
  const { result, unmount } = renderHook(() =>
    useMultiClick<TestEvent>({ 1: single, 2: double, 3: triple }, threshold),
  );
  return { click: result.current, single, double, triple, unmount };
}

describe("useMultiClick", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires the single-click handler immediately", () => {
    const { click, single, double, triple } = setup();

    act(() => click(makeEvent(1)));

    expect(single).toHaveBeenCalledTimes(1);
    expect(double).not.toHaveBeenCalled();
    expect(triple).not.toHaveBeenCalled();
  });

  it("treats keyboard-generated clicks (detail 0) as a single click", () => {
    const { click, single } = setup();

    act(() => click(makeEvent(0)));

    expect(single).toHaveBeenCalledTimes(1);
  });

  it("does not fire double-click until the multi-click window closes", () => {
    const { click, single, double } = setup();

    act(() => click(makeEvent(1)));
    act(() => click(makeEvent(2)));

    expect(single).toHaveBeenCalledTimes(1);
    expect(double).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(MULTI_CLICK_THRESHOLD);
    });

    expect(double).toHaveBeenCalledTimes(1);
    expect(single).toHaveBeenCalledTimes(1);
  });

  it("lets the highest count in the sequence win", () => {
    const { click, single, double, triple } = setup();

    act(() => click(makeEvent(1)));
    act(() => click(makeEvent(2)));
    act(() => click(makeEvent(3)));

    act(() => {
      vi.advanceTimersByTime(MULTI_CLICK_THRESHOLD);
    });

    expect(triple).toHaveBeenCalledTimes(1);
    expect(double).not.toHaveBeenCalled();
    expect(single).toHaveBeenCalledTimes(1);
  });

  it("collapses a long click burst into one single click", () => {
    const { click, single, double, triple } = setup();

    act(() => click(makeEvent(1)));
    act(() => {
      vi.advanceTimersByTime(MULTI_CLICK_THRESHOLD + 1);
    });
    act(() => click(makeEvent(1)));
    act(() => {
      vi.advanceTimersByTime(MULTI_CLICK_THRESHOLD + 1);
    });

    expect(single).toHaveBeenCalledTimes(2);
    expect(double).not.toHaveBeenCalled();
    expect(triple).not.toHaveBeenCalled();
  });

  it("restarts the window on each additional click", () => {
    const { click, double, triple } = setup();

    act(() => click(makeEvent(1)));
    act(() => click(makeEvent(2)));

    act(() => {
      vi.advanceTimersByTime(MULTI_CLICK_THRESHOLD - 100);
    });

    act(() => click(makeEvent(3)));

    act(() => {
      vi.advanceTimersByTime(MULTI_CLICK_THRESHOLD - 100);
    });

    expect(triple).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(MULTI_CLICK_THRESHOLD);
    });

    expect(triple).toHaveBeenCalledTimes(1);
    expect(double).not.toHaveBeenCalled();
  });

  it("falls back to the closest lower count that is defined", () => {
    const single = vi.fn();
    const double = vi.fn();
    const { result } = renderHook(() =>
      useMultiClick<TestEvent>({ 1: single, 2: double }),
    );

    act(() => result.current(makeEvent(1)));
    act(() => result.current(makeEvent(2)));
    act(() => result.current(makeEvent(3)));
    act(() => result.current(makeEvent(4)));

    act(() => {
      vi.advanceTimersByTime(MULTI_CLICK_THRESHOLD);
    });

    expect(double).toHaveBeenCalledTimes(1);
    expect(single).toHaveBeenCalledTimes(1);
  });

  it("honours a caller-supplied threshold", () => {
    const { click, double } = setup(200);

    act(() => click(makeEvent(2)));

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(double).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(double).toHaveBeenCalledTimes(1);
  });

  it("does not fire a pending multi-click after unmount", () => {
    const { click, double, unmount } = setup();

    act(() => click(makeEvent(2)));
    unmount();

    act(() => {
      vi.advanceTimersByTime(MULTI_CLICK_THRESHOLD * 2);
    });

    expect(double).not.toHaveBeenCalled();
  });
});
