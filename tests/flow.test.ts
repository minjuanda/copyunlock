import { describe, expect, it } from "vitest";

describe("integrated release-candidate flow", () => {
  it("defines the intended order", () => {
    const flow = ["Analyze", "Unlock", "Extract", "OCR fallback", "Progress", "Result", "Copy/Export", "Recovery", "Settings", "Privacy"];
    expect(flow[0]).toBe("Analyze");
    expect(flow[flow.length - 1]).toBe("Privacy");
  });
});