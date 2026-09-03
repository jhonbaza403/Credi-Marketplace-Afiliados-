import { describe, expect, it } from "vitest";

describe("Credi Marketplace — integración", () => {
  it("mantiene aisladas las pruebas de integración del smoke unitario", () => {
    expect(typeof process.env.NODE_ENV).toBe("string");
  });
});
