import { describe, expect, it } from "vitest";
import { isPlaywrightSupabasePlaceholder } from "@/lib/database/test-runtime";

describe("Playwright Supabase placeholder detection", () => {
  it("recognizes the exact local placeholder pair used by the E2E web server", () => {
    expect(
      isPlaywrightSupabasePlaceholder(
        "http://127.0.0.1:54321",
        "ci-placeholder-publishable-key",
      ),
    ).toBe(true);
  });

  it("does not skip a real Supabase project URL", () => {
    expect(
      isPlaywrightSupabasePlaceholder(
        "https://project.supabase.co",
        "sb_publishable_test_key",
      ),
    ).toBe(false);
  });

  it("does not skip local Supabase when the configured key is different", () => {
    expect(
      isPlaywrightSupabasePlaceholder(
        "http://127.0.0.1:54321",
        "sb_publishable_local_key",
      ),
    ).toBe(false);
  });
});
