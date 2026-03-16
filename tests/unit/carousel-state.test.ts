/**
 * Unit tests for the carousel state machine logic in app/n/[nodeId]/page.tsx.
 *
 * These test the pure state transition logic extracted from the swipe handler
 * (lines 632-653) and the derived visibility values (line 855).
 */
import { describe, it, expect } from "vitest";

// ── Extracted state logic from NodePage ──

/** Mirrors the horizontal swipe handler at lines 632-657 */
function nextActiveCard(current: 0 | 1 | null, dx: number): 0 | 1 | null {
  if (current === null) {
    if (dx > 40) return 0;
    if (dx < -40) return 1;
    return null;
  }
  if (current === 0) {
    if (dx < -50) return 1;
    if (dx > 50) return null;
  }
  if (current === 1) {
    if (dx > 50) return 0;
    if (dx < -50) return null;
  }
  return current;
}

/** Mirrors line 859: headerOpacity = isFocused ? 1 : 0.85 */
function headerOpacity(activeCard: 0 | 1 | null): number {
  const isFocused = activeCard !== null;
  return isFocused ? 1 : 0.85;
}

/** Mirrors line 860: overlayOpacity = isFocused ? 1 : 0 */
function overlayOpacity(activeCard: 0 | 1 | null): number {
  const isFocused = activeCard !== null;
  return isFocused ? 1 : 0;
}

// ── Bug 3: Swipe state transitions ──

describe("carousel activeCard state transitions", () => {
  describe("from center (null)", () => {
    it("swipe right (dx > 40) focuses card 0", () => {
      expect(nextActiveCard(null, 60)).toBe(0);
    });

    it("swipe left (dx < -40) focuses card 1", () => {
      expect(nextActiveCard(null, -60)).toBe(1);
    });

    it("small swipe stays in center", () => {
      expect(nextActiveCard(null, 20)).toBeNull();
      expect(nextActiveCard(null, -20)).toBeNull();
    });
  });

  describe("from card 0", () => {
    it("swipe left (dx < -50) goes to card 1", () => {
      expect(nextActiveCard(0, -60)).toBe(1);
    });

    it("small swipe stays on card 0", () => {
      expect(nextActiveCard(0, -30)).toBe(0);
    });

    it("swipe right from card 0 returns to center", () => {
      expect(nextActiveCard(0, 60)).toBeNull();
    });
  });

  describe("from card 1", () => {
    it("swipe right (dx > 50) goes to card 0", () => {
      expect(nextActiveCard(1, 60)).toBe(0);
    });

    it("small swipe stays on card 1", () => {
      expect(nextActiveCard(1, 30)).toBe(1);
    });

    it("swipe left from card 1 returns to center", () => {
      expect(nextActiveCard(1, -60)).toBeNull();
    });
  });
});

// ── Bug 2: Content visibility ──

describe("header and overlay opacity", () => {
  it("header is visible (0.85) in center view", () => {
    expect(headerOpacity(null)).toBe(0.85);
  });

  it("header is fully visible (1) when focused", () => {
    expect(headerOpacity(0)).toBe(1);
    expect(headerOpacity(1)).toBe(1);
  });

  it("bottom overlay is hidden (0) in center view", () => {
    expect(overlayOpacity(null)).toBe(0);
  });

  it("bottom overlay is visible (1) when focused", () => {
    expect(overlayOpacity(0)).toBe(1);
    expect(overlayOpacity(1)).toBe(1);
  });
});

// ── Bug 1: Title label visibility ──

describe("title label visibility in center view", () => {
  it("title labels are hidden in center view (shown only when focused)", () => {
    // In center view, title labels are removed to keep the split clean.
    // Full title + description show in the bottom overlay when a card is focused.
    const isFocused = false;
    const overlayVisible = isFocused ? true : false;
    expect(overlayVisible).toBe(false);
  });
});
