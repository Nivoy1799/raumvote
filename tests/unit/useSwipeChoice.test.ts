/**
 * Unit tests for lib/useSwipeChoice.ts
 *
 * Tests the swipe gesture hook in isolation using renderHook.
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSwipeChoice } from "@/lib/useSwipeChoice";

function makePointerEvent(overrides: Partial<React.PointerEvent> = {}): React.PointerEvent {
  return {
    clientX: 0,
    clientY: 0,
    ...overrides,
  } as React.PointerEvent;
}

describe("useSwipeChoice", () => {
  it("fires onChoice('left') on leftward horizontal swipe exceeding threshold", () => {
    const onChoice = vi.fn();
    const { result } = renderHook(() => useSwipeChoice({ onChoice }));
    const handlers = result.current.bind();

    act(() => {
      handlers.onPointerDown(makePointerEvent({ clientX: 200, clientY: 300 }));
      handlers.onPointerMove(makePointerEvent({ clientX: 100, clientY: 300 }));
      handlers.onPointerUp(makePointerEvent({ clientX: 100, clientY: 300 }));
    });

    expect(onChoice).toHaveBeenCalledWith("left");
  });

  it("fires onChoice('right') on rightward horizontal swipe exceeding threshold", () => {
    const onChoice = vi.fn();
    const { result } = renderHook(() => useSwipeChoice({ onChoice }));
    const handlers = result.current.bind();

    act(() => {
      handlers.onPointerDown(makePointerEvent({ clientX: 100, clientY: 300 }));
      handlers.onPointerMove(makePointerEvent({ clientX: 200, clientY: 300 }));
      handlers.onPointerUp(makePointerEvent({ clientX: 200, clientY: 300 }));
    });

    expect(onChoice).toHaveBeenCalledWith("right");
  });

  it("does not fire if horizontal swipe is below threshold", () => {
    const onChoice = vi.fn();
    const { result } = renderHook(() => useSwipeChoice({ onChoice }));
    const handlers = result.current.bind();

    act(() => {
      handlers.onPointerDown(makePointerEvent({ clientX: 200, clientY: 300 }));
      handlers.onPointerMove(makePointerEvent({ clientX: 160, clientY: 300 }));
      handlers.onPointerUp(makePointerEvent({ clientX: 160, clientY: 300 }));
    });

    expect(onChoice).not.toHaveBeenCalled();
  });

  it("fires onSwipeUp on upward vertical swipe exceeding threshold", () => {
    const onChoice = vi.fn();
    const onSwipeUp = vi.fn();
    const { result } = renderHook(() => useSwipeChoice({ onChoice, onSwipeUp }));
    const handlers = result.current.bind();

    act(() => {
      handlers.onPointerDown(makePointerEvent({ clientX: 200, clientY: 400 }));
      handlers.onPointerMove(makePointerEvent({ clientX: 200, clientY: 300 }));
      handlers.onPointerUp(makePointerEvent({ clientX: 200, clientY: 300 }));
    });

    expect(onSwipeUp).toHaveBeenCalled();
    expect(onChoice).not.toHaveBeenCalled();
  });

  it("does not fire onSwipeUp on downward swipe", () => {
    const onChoice = vi.fn();
    const onSwipeUp = vi.fn();
    const { result } = renderHook(() => useSwipeChoice({ onChoice, onSwipeUp }));
    const handlers = result.current.bind();

    act(() => {
      handlers.onPointerDown(makePointerEvent({ clientX: 200, clientY: 300 }));
      handlers.onPointerMove(makePointerEvent({ clientX: 200, clientY: 400 }));
      handlers.onPointerUp(makePointerEvent({ clientX: 200, clientY: 400 }));
    });

    expect(onSwipeUp).not.toHaveBeenCalled();
    expect(onChoice).not.toHaveBeenCalled();
  });

  it("respects custom thresholdPx", () => {
    const onChoice = vi.fn();
    const { result } = renderHook(() => useSwipeChoice({ onChoice, thresholdPx: 30 }));
    const handlers = result.current.bind();

    act(() => {
      handlers.onPointerDown(makePointerEvent({ clientX: 200, clientY: 300 }));
      handlers.onPointerMove(makePointerEvent({ clientX: 160, clientY: 300 }));
      handlers.onPointerUp(makePointerEvent({ clientX: 160, clientY: 300 }));
    });

    expect(onChoice).toHaveBeenCalledWith("left");
  });

  it("vertical axis dominates when dy > dx — no horizontal choice fired", () => {
    const onChoice = vi.fn();
    const { result } = renderHook(() => useSwipeChoice({ onChoice }));
    const handlers = result.current.bind();

    act(() => {
      handlers.onPointerDown(makePointerEvent({ clientX: 200, clientY: 400 }));
      handlers.onPointerMove(makePointerEvent({ clientX: 230, clientY: 200 }));
      handlers.onPointerUp(makePointerEvent({ clientX: 230, clientY: 200 }));
    });

    // dy (200) > dx (30), so vertical axis dominates — no horizontal choice
    expect(onChoice).not.toHaveBeenCalled();
  });
});
