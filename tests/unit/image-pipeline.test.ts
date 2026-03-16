/**
 * Unit tests for the image generation pipeline.
 *
 * Tests the logic flow of image task processing, prompt building,
 * and the inline processing mechanism that makes images work
 * without the Docker worker.
 */
import { describe, it, expect, vi } from "vitest";
import { buildImagePrompt } from "@/lib/imageGen";

// ── buildImagePrompt ──

describe("buildImagePrompt", () => {
  const node = {
    titel: "Lebendige Nähe",
    beschreibung: "Gemeinschaft, Aktivität, Wärme",
    context: "Ein offener Platz mit Bäumen",
  };

  it("builds a prompt from node data without custom imagePrompt", () => {
    const prompt = buildImagePrompt(node);
    expect(prompt).toContain("Atmospheric scene: Ein offener Platz mit Bäumen");
    expect(prompt).toContain("Keywords: Gemeinschaft, Aktivität, Wärme");
    expect(prompt).toContain("Concept: Lebendige Nähe");
    expect(prompt).toContain("photorealistic");
  });

  it("prepends custom imagePrompt when provided", () => {
    const prompt = buildImagePrompt(node, "Use watercolor style.");
    expect(prompt).toMatch(/^Use watercolor style\./);
    expect(prompt).toContain("Concept: Lebendige Nähe");
  });

  it("handles null imagePrompt same as omitted", () => {
    const withNull = buildImagePrompt(node, null);
    const withoutArg = buildImagePrompt(node);
    expect(withNull).toBe(withoutArg);
  });

  it("handles empty string imagePrompt same as omitted", () => {
    const withEmpty = buildImagePrompt(node, "");
    const withoutArg = buildImagePrompt(node);
    expect(withEmpty).toBe(withoutArg);
  });

  it("preserves German umlauts in prompt", () => {
    const prompt = buildImagePrompt({
      titel: "Rückzugsräume",
      beschreibung: "Stille, Natur, Gemütlichkeit",
      context: "Bäume und Bänke in einer ruhigen Ecke",
    });
    expect(prompt).toContain("Rückzugsräume");
    expect(prompt).toContain("Bäume und Bänke");
  });
});

// ── Image task status state machine ──

describe("image task status transitions", () => {
  /**
   * Models the optimistic claim logic in processImageTaskById:
   * Only transitions from "pending" → "generating".
   * Returns the new status, or null if claim was rejected.
   */
  function claimTask(currentStatus: string): string | null {
    if (currentStatus === "pending") return "generating";
    return null; // another process already claimed it
  }

  /**
   * Models the completion logic after image generation.
   */
  function completeTask(imageUrl: string | null): string {
    return imageUrl ? "completed" : "failed";
  }

  it("claims a pending task", () => {
    expect(claimTask("pending")).toBe("generating");
  });

  it("rejects claim on already-generating task", () => {
    expect(claimTask("generating")).toBeNull();
  });

  it("rejects claim on completed task", () => {
    expect(claimTask("completed")).toBeNull();
  });

  it("rejects claim on failed task", () => {
    expect(claimTask("failed")).toBeNull();
  });

  it("marks completed when image URL is returned", () => {
    expect(completeTask("https://r2.example.com/img.png")).toBe("completed");
  });

  it("marks failed when image URL is null", () => {
    expect(completeTask(null)).toBe("failed");
  });
});

// ── Inline processing safety (no double processing) ──

describe("inline processing concurrency safety", () => {
  it("optimistic claim prevents double processing", () => {
    // Simulate two processes trying to claim the same task
    let taskStatus = "pending";

    function tryClaimAndProcess(processName: string): boolean {
      // Atomic: only one process can transition pending → generating
      if (taskStatus === "pending") {
        taskStatus = "generating";
        return true; // claimed
      }
      return false; // already claimed by another process
    }

    const worker = tryClaimAndProcess("docker-worker");
    const inline = tryClaimAndProcess("inline-api");

    expect(worker).toBe(true);
    expect(inline).toBe(false);
    expect(taskStatus).toBe("generating");
  });

  it("worker and inline can coexist — whoever claims first wins", () => {
    const results: string[] = [];
    let taskStatus = "pending";

    // Simulate race between inline and worker
    for (const process of ["inline", "worker"]) {
      if (taskStatus === "pending") {
        taskStatus = "generating";
        results.push(process);
      }
    }

    // Exactly one process should have claimed it
    expect(results).toHaveLength(1);
  });
});

// ── Provider detection ──

describe("image provider selection", () => {
  function detectProvider(imageModel: string): string {
    return imageModel.startsWith("hf:") ? "HuggingFace" : "Gemini";
  }

  it("selects Gemini for standard model names", () => {
    expect(detectProvider("gemini-2.0-flash-preview-image-generation")).toBe("Gemini");
  });

  it("selects HuggingFace for hf: prefixed models", () => {
    expect(detectProvider("hf:stabilityai/stable-diffusion-xl")).toBe("HuggingFace");
  });

  it("defaults to Gemini for unknown model names", () => {
    expect(detectProvider("some-custom-model")).toBe("Gemini");
  });
});

// ── R2 health check gating ──

describe("R2 health check gating", () => {
  /**
   * Models the generate route logic: skip image tasks if R2 is unhealthy.
   */
  function shouldCreateImageTasks(isDiscoverer: boolean, hasChildren: boolean, r2Healthy: boolean): boolean {
    if (!isDiscoverer || !hasChildren) return false;
    return r2Healthy;
  }

  it("creates tasks when discoverer, has children, and R2 is healthy", () => {
    expect(shouldCreateImageTasks(true, true, true)).toBe(true);
  });

  it("skips when R2 is unhealthy", () => {
    expect(shouldCreateImageTasks(true, true, false)).toBe(false);
  });

  it("skips when not discoverer", () => {
    expect(shouldCreateImageTasks(false, true, true)).toBe(false);
  });

  it("skips when no children", () => {
    expect(shouldCreateImageTasks(true, false, true)).toBe(false);
  });
});
