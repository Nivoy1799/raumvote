/**
 * E2E tests for the node page (app/n/[nodeId]/page.tsx)
 *
 * Tests the swipe gestures, hint visibility, and UI bugs
 * on a real browser with a mobile viewport.
 */
import { test, expect, type Page } from "@playwright/test";

// The login token provided for testing
const LOGIN_TOKEN = "5a6c6722-fac5-44e2-8c28-23c1b4b679b3";

/** Helper: simulate a horizontal swipe */
async function swipeHorizontal(page: Page, dx: number) {
  const viewport = page.viewportSize()!;
  const cx = viewport.width / 2;
  const cy = viewport.height / 2;

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + dx, cy, { steps: 15 });
  await page.mouse.up();
  // Wait for transition animation
  await page.waitForTimeout(500);
}

test.describe("Node page — center view", () => {
  test.beforeEach(async ({ page }) => {
    // Log in via the token URL
    await page.goto(`/login/${LOGIN_TOKEN}`);
    await page.waitForURL("**/start");

    // Navigate to the root node via the "Los geht's" button
    await page.getByRole("button", { name: "Los geht's" }).click();
    await page.waitForURL(/\/n\/.+/);
    // Wait for images to load
    await page.waitForTimeout(2000);
  });

  test("center hint 'Wische zur Seite' is visible on load", async ({ page }) => {
    const hint = page.getByText("Wische zur Seite");
    await expect(hint).toBeVisible();
  });

  test("question header is visible but bottom overlay is hidden in center view", async ({ page }) => {
    // Header should be visible
    const header = page.locator("header");
    const headerOp = await header.evaluate((el) => window.getComputedStyle(el).opacity);
    expect(parseFloat(headerOp)).toBeGreaterThan(0);

    // Bottom overlay (action rail, description) should be hidden
    // The overlay has the gradient background and opacity 0 in center view
    const overlayOp = await page.evaluate(() => {
      const els = document.querySelectorAll('div[style*="linear-gradient"]');
      for (const el of els) {
        const op = window.getComputedStyle(el).opacity;
        if (parseFloat(op) === 0) return 0;
      }
      return 1;
    });
    expect(overlayOp).toBe(0);
  });

  test("no stray title labels visible in center view", async ({ page }) => {
    // In center view, only the question header and "Wische zur Seite" hint should show.
    // The option titles should NOT be visible (they appear when a card is focused).
    const bottomOverlays = await page.evaluate(() => {
      const els = document.querySelectorAll('div[style*="linear-gradient"]');
      return Array.from(els).map((el) => ({
        opacity: window.getComputedStyle(el).opacity,
      }));
    });
    // All bottom overlays should have opacity 0
    for (const overlay of bottomOverlays) {
      expect(parseFloat(overlay.opacity)).toBe(0);
    }
  });
});

test.describe("Node page — swipe gestures", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/login/${LOGIN_TOKEN}`);
    await page.waitForURL("**/start");
    await page.getByRole("button", { name: "Los geht's" }).click();
    await page.waitForURL(/\/n\/.+/);
    await page.waitForTimeout(2000);
  });

  test("swipe left from center focuses a card (hides center hint)", async ({ page }) => {
    // Verify center hint is initially visible
    await expect(page.getByText("Wische zur Seite")).toBeVisible();

    // Swipe left to focus card 1
    await swipeHorizontal(page, -120);

    // Center hint should disappear when a card is focused
    await expect(page.getByText("Wische zur Seite")).not.toBeVisible();
  });

  test("swipe right from center focuses a card", async ({ page }) => {
    await swipeHorizontal(page, 120);

    // Center hint should disappear
    await expect(page.getByText("Wische zur Seite")).not.toBeVisible();
  });

  test("can toggle between card 0 and card 1", async ({ page }) => {
    // Focus card 0
    await swipeHorizontal(page, 120);

    // Swipe left to go to card 1
    await swipeHorizontal(page, -120);

    // Swipe right to go back to card 0
    await swipeHorizontal(page, 120);

    // Should still be on a focused card (not center)
    await expect(page.getByText("Wische zur Seite")).not.toBeVisible();
  });

  test("swiping at edge returns to center/split view", async ({ page }) => {
    // Focus card 0 by swiping right
    await swipeHorizontal(page, 120);
    await expect(page.getByText("Wische zur Seite")).not.toBeVisible();

    // Swipe right again at the edge of card 0 via pointer events
    // (mouse events may not trigger pointer handlers in mobile emulation)
    const viewport = page.viewportSize()!;
    const cx = viewport.width / 2;
    const cy = viewport.height / 2;
    await page.evaluate(
      ({ x, y, dx }) => {
        const el = document.elementFromPoint(x, y);
        if (!el) return;
        el.dispatchEvent(new PointerEvent("pointerdown", { clientX: x, clientY: y, bubbles: true }));
        for (let i = 1; i <= 10; i++) {
          el.dispatchEvent(
            new PointerEvent("pointermove", {
              clientX: x + (dx * i) / 10,
              clientY: y,
              bubbles: true,
            }),
          );
        }
        el.dispatchEvent(new PointerEvent("pointerup", { clientX: x + dx, clientY: y, bubbles: true }));
      },
      { x: cx, y: cy, dx: 200 },
    );
    await page.waitForTimeout(600);

    // Center hint should reappear
    await expect(page.getByText("Wische zur Seite")).toBeVisible();
  });

  test("swipe-up hint appears when card is focused", async ({ page }) => {
    // Clear the swipe-up learned counter so the hint shows
    await page.evaluate(() => localStorage.removeItem("rv-swipeup-count"));

    // Focus a card
    await swipeHorizontal(page, 120);

    // Wait for the swipe-up hint animation to cycle to its visible phase
    // The animation is: 0-15% visible, 85-100% fade out, 6s total
    // So within 1s it should be in the visible phase
    await page.waitForTimeout(1000);

    const hint = page.getByText("Nach oben wischen");
    await expect(hint).toBeAttached();
  });

  test("swipe up from focused card navigates to child node", async ({ page }) => {
    const initialUrl = page.url();

    // Focus a card first
    await swipeHorizontal(page, 120);
    await page.waitForTimeout(500);

    // Use touchscreen for vertical swipe (mobile emulation uses touch)
    const viewport = page.viewportSize()!;
    const cx = viewport.width / 2;
    const startY = viewport.height * 0.6;

    await page.touchscreen.tap(cx, startY);
    await page.waitForTimeout(100);

    // Dispatch pointer events directly since touch-to-pointer may vary
    await page.evaluate(
      ({ x, startY, endY }) => {
        const el = document.elementFromPoint(x, startY);
        if (!el) return;
        el.dispatchEvent(
          new PointerEvent("pointerdown", {
            clientX: x,
            clientY: startY,
            bubbles: true,
          }),
        );
        // Move in steps for axis detection
        for (let i = 1; i <= 10; i++) {
          const y = startY + ((endY - startY) * i) / 10;
          el.dispatchEvent(
            new PointerEvent("pointermove", {
              clientX: x,
              clientY: y,
              bubbles: true,
            }),
          );
        }
        el.dispatchEvent(
          new PointerEvent("pointerup", {
            clientX: x,
            clientY: endY,
            bubbles: true,
          }),
        );
      },
      { x: cx, startY, endY: startY - 200 },
    );

    // Wait for navigation or loading screen
    await page.waitForTimeout(4000);

    const currentUrl = page.url();
    const generatingMessages = [
      "Generiere neue Realitäten",
      "Wie könnte dein Platz noch aussehen",
      "Vibing",
      "Feels like new home",
    ];
    let loadingVisible = false;
    for (const msg of generatingMessages) {
      loadingVisible =
        loadingVisible ||
        (await page
          .getByText(msg)
          .isVisible()
          .catch(() => false));
    }
    const navigated = currentUrl !== initialUrl || loadingVisible;
    expect(navigated).toBe(true);
  });
});

test.describe("Node page — header and action rail", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/login/${LOGIN_TOKEN}`);
    await page.waitForURL("**/start");
    await page.getByRole("button", { name: "Los geht's" }).click();
    await page.waitForURL(/\/n\/.+/);
    await page.waitForTimeout(2000);
  });

  test("question header becomes visible when card is focused", async ({ page }) => {
    // Swipe to focus a card
    await swipeHorizontal(page, 120);

    const header = page.locator("header");
    const opacity = await header.evaluate((el) => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBe(1);
  });

  test("action rail buttons are visible when card is focused", async ({ page }) => {
    await swipeHorizontal(page, 120);

    // Check that like/vote/comment/share buttons are visible
    await expect(page.getByRole("button", { name: "Gefällt mir" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Abstimmen" }).first()).toBeVisible();
  });
});
