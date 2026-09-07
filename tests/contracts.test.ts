import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/settings";
import { PRIVACY_CONTRACT } from "../src/privacy";

describe("v0.9 contracts", () => {
  it("uses safe defaults", () => {
    expect(DEFAULT_SETTINGS.autoUnlock).toBe(true);
    expect(DEFAULT_SETTINGS.ocrEnabled).toBe(false);
    expect(DEFAULT_SETTINGS.saveHistory).toBe(false);
  });
  it("keeps page content local", () => {
    expect(PRIVACY_CONTRACT.localFirst).toBe(true);
    expect(PRIVACY_CONTRACT.pageContentSentToCloud).toBe(false);
    expect(PRIVACY_CONTRACT.ocrModelsLocal).toBe(true);
  });
});