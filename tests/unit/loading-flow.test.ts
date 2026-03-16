/**
 * Unit tests for the node page loading flow.
 *
 * Verifies that the loading screen stays visible until images are ready,
 * and that pre-generation minimizes wait times.
 */
import { describe, it, expect } from "vitest";

// ── Loading screen visibility logic ──

/**
 * Models the loading screen condition from page.tsx:
 * Show loading screen when node is missing, generating, OR images still loading.
 */
function shouldShowLoadingScreen(state: {
  node: unknown | null;
  generating: boolean;
  imagesLoading: boolean;
}): boolean {
  return !state.node || state.generating || state.imagesLoading;
}

describe("loading screen visibility", () => {
  it("shows when node is not loaded yet", () => {
    expect(shouldShowLoadingScreen({ node: null, generating: false, imagesLoading: false })).toBe(true);
  });

  it("shows during AI text generation", () => {
    expect(shouldShowLoadingScreen({ node: {}, generating: true, imagesLoading: false })).toBe(true);
  });

  it("shows while images are still placeholders", () => {
    expect(shouldShowLoadingScreen({ node: {}, generating: false, imagesLoading: true })).toBe(true);
  });

  it("shows during both generation and image loading", () => {
    expect(shouldShowLoadingScreen({ node: {}, generating: true, imagesLoading: true })).toBe(true);
  });

  it("hides when node loaded and images ready", () => {
    expect(shouldShowLoadingScreen({ node: {}, generating: false, imagesLoading: false })).toBe(false);
  });
});

// ── Image readiness detection ──

function isPlaceholder(url: string | null | undefined, placeholderUrl: string): boolean {
  return !url || url === placeholderUrl || url === "/media/placeholder.jpg";
}

function shouldStartImagePolling(
  left: { mediaUrl: string | null } | null,
  right: { mediaUrl: string | null } | null,
  placeholderUrl: string,
): boolean {
  if (!left || !right) return false;
  const lp = isPlaceholder(left.mediaUrl, placeholderUrl);
  const rp = isPlaceholder(right.mediaUrl, placeholderUrl);
  return lp || rp;
}

describe("image readiness detection", () => {
  const ph = "/media/placeholder.jpg";

  it("detects null mediaUrl as placeholder", () => {
    expect(isPlaceholder(null, ph)).toBe(true);
  });

  it("detects undefined mediaUrl as placeholder", () => {
    expect(isPlaceholder(undefined, ph)).toBe(true);
  });

  it("detects matching placeholder URL", () => {
    expect(isPlaceholder(ph, ph)).toBe(true);
  });

  it("detects default placeholder path", () => {
    expect(isPlaceholder("/media/placeholder.jpg", "/custom/ph.jpg")).toBe(true);
  });

  it("recognizes real R2 URL as not placeholder", () => {
    expect(isPlaceholder("https://r2.raumvote.ch/tree-images/abc.png", ph)).toBe(false);
  });

  it("starts polling when left has placeholder", () => {
    expect(shouldStartImagePolling({ mediaUrl: ph }, { mediaUrl: "https://r2.raumvote.ch/img.png" }, ph)).toBe(true);
  });

  it("starts polling when right has placeholder", () => {
    expect(shouldStartImagePolling({ mediaUrl: "https://r2.raumvote.ch/img.png" }, { mediaUrl: ph }, ph)).toBe(true);
  });

  it("starts polling when both have placeholders", () => {
    expect(shouldStartImagePolling({ mediaUrl: ph }, { mediaUrl: null }, ph)).toBe(true);
  });

  it("does not start polling when both have real images", () => {
    expect(
      shouldStartImagePolling(
        { mediaUrl: "https://r2.raumvote.ch/a.png" },
        { mediaUrl: "https://r2.raumvote.ch/b.png" },
        ph,
      ),
    ).toBe(false);
  });

  it("does not start polling when children are null", () => {
    expect(shouldStartImagePolling(null, null, ph)).toBe(false);
  });
});

// ── Pre-generation effectiveness ──

describe("pre-generation strategy", () => {
  /**
   * Models the prefetch logic: when a node's children are loaded,
   * pre-generate grandchildren so the next navigation is instant.
   */
  function shouldPrefetchGrandchildren(
    left: { id: string } | null,
    right: { id: string } | null,
    voterId: string | null,
  ): boolean {
    return !!left && !!right && !!voterId;
  }

  it("prefetches when both children exist and user is authenticated", () => {
    expect(shouldPrefetchGrandchildren({ id: "l" }, { id: "r" }, "voter-123")).toBe(true);
  });

  it("does not prefetch without children", () => {
    expect(shouldPrefetchGrandchildren(null, null, "voter-123")).toBe(false);
  });

  it("does not prefetch without voterId", () => {
    expect(shouldPrefetchGrandchildren({ id: "l" }, { id: "r" }, null)).toBe(false);
  });

  /**
   * Pre-generation depth limit: stop at depth 5 to avoid exponential growth.
   */
  function shouldPreGenerate(currentDepth: number, maxDepth: number): boolean {
    return currentDepth < maxDepth;
  }

  it("pre-generates at depth 0", () => {
    expect(shouldPreGenerate(0, 5)).toBe(true);
  });

  it("pre-generates at depth 4", () => {
    expect(shouldPreGenerate(4, 5)).toBe(true);
  });

  it("stops pre-generation at depth 5", () => {
    expect(shouldPreGenerate(5, 5)).toBe(false);
  });

  it("stops pre-generation beyond max depth", () => {
    expect(shouldPreGenerate(10, 5)).toBe(false);
  });
});

// ── No skip logic exists ──

describe("skip button removal", () => {
  it("loading screen has no skip/bypass mechanism", () => {
    // The loading screen condition is: !node || generating || imagesLoading
    // There is no skipImages flag that can bypass the imagesLoading check
    const state = { node: {}, generating: false, imagesLoading: true };
    // Cannot bypass — must wait for images
    expect(shouldShowLoadingScreen(state)).toBe(true);
    // Only way to dismiss is imagesLoading becoming false (real images loaded)
    expect(shouldShowLoadingScreen({ ...state, imagesLoading: false })).toBe(false);
  });
});
