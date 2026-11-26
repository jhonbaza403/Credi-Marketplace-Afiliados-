import { describe, expect, it } from "vitest";
import { PORTAL_DOMAINS, PORTAL_PILLARS } from "@/config/portal";

describe("Credi four-pillar portal taxonomy", () => {
  it("defines the four product pillars in their canonical order", () => {
    expect(PORTAL_PILLARS.map((pillar) => pillar.key)).toEqual([
      "social",
      "messaging",
      "commerce",
      "supply",
    ]);
  });

  it("uses unique stable keys for every registered destination", () => {
    const keys = PORTAL_DOMAINS.map((domain) => domain.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("assigns every customer-facing capability to one of the four pillars", () => {
    const validPillars = new Set(PORTAL_PILLARS.map((pillar) => pillar.key));
    const customerFacing = PORTAL_DOMAINS.filter(
      (domain) => !["admin", "admin_compliance", "login", "register", "search"].includes(domain.key),
    );

    expect(customerFacing.every((domain) => domain.pillar && validPillars.has(domain.pillar))).toBe(true);
  });

  it("registers creator profiles and broadcast channels in their canonical pillars", () => {
    expect(PORTAL_DOMAINS.find((domain) => domain.key === "creators")).toMatchObject({
      href: "/creadores",
      pillar: "social",
    });
    expect(PORTAL_DOMAINS.find((domain) => domain.key === "channels")).toMatchObject({
      href: "/canales",
      pillar: "messaging",
    });
  });

  it("keeps LIVE in primary navigation and in the social/video pillar", () => {
    const live = PORTAL_DOMAINS.find((domain) => domain.key === "live");
    expect(live).toMatchObject({
      href: "/live",
      group: "primary",
      pillar: "social",
    });
  });

  it("does not confuse navigation metadata with authorization for public routes", () => {
    const marketplace = PORTAL_DOMAINS.find((domain) => domain.key === "marketplace");
    const chat = PORTAL_DOMAINS.find((domain) => domain.key === "chat");
    const admin = PORTAL_DOMAINS.find((domain) => domain.key === "admin");

    expect(marketplace?.requiresAuth).toBeUndefined();
    expect(chat?.requiresAuth).toBe(true);
    expect(admin?.roles).toEqual(["admin"]);
  });
});
