import { expect, test } from "@playwright/test";

test.describe("Credi Marketing and LIVE API contracts", () => {
  test("marketing campaigns fails closed without authentication", async ({ request }) => {
    const getResponse = await request.get("/api/marketing/campaigns");
    expect(getResponse.status()).toBe(401);

    const postResponse = await request.post("/api/marketing/campaigns", {
      data: { name: "test", objective: "sales", dailyBudget: 10, placements: ["credi_wall"] },
    });
    expect(postResponse.status()).toBe(401);
  });

  test("marketing campaign rejects invalid payload", async ({ request }) => {
    const response = await request.post("/api/marketing/campaigns", {
      data: { name: "", objective: "invalid", dailyBudget: -1, placements: [] },
    });
    expect([400, 401]).toContain(response.status());
  });

  test("marketing creative endpoint requires an authenticated owner", async ({ request }) => {
    const response = await request.get("/api/marketing/campaigns/not-a-uuid/creatives");
    expect([400, 401]).toContain(response.status());
  });

  test("live API fails closed without authentication", async ({ request }) => {
    expect((await request.get("/api/live")).status()).toBe(401);
    expect((await request.post("/api/live", {
      data: { title: "Credi Test LIVE", description: "", scheduledAt: null, coverMedia: [] },
    })).status()).toBe(401);
  });

  test("live product endpoint rejects malformed room identifiers before data access", async ({ request }) => {
    const response = await request.get("/api/live/products?roomId=not-a-uuid");
    expect([400, 401]).toContain(response.status());
  });
});
