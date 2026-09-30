import { expect, test } from "@playwright/test";

test.describe("operation observability", () => {
  test("rejects malformed operation identifiers before database access", async ({ request }) => {
    const response = await request.get("/api/operations/not-a-uuid");
    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      code: "INVALID_OPERATION_ID",
    });
  });

  test("requires authentication for a valid operation identifier", async ({ request }) => {
    const response = await request.get("/api/operations/00000000-0000-4000-8000-000000000000");
    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      code: "UNAUTHENTICATED",
    });
  });
});
