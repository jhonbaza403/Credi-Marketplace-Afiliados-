import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/app/(auth)/register/page";

describe("normalizePhone", () => {
  it("accepts a valid E.164-style phone with presentation separators", () => {
    expect(normalizePhone("+58 412 1234567")).toBe("+584121234567");
  });

  it("rejects numbers without an international country prefix", () => {
    expect(normalizePhone("04121234567")).toBeNull();
  });

  it("rejects numbers longer than the international limit", () => {
    expect(normalizePhone("+1234567890123456")).toBeNull();
  });
});
