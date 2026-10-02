import { expect, test } from "@playwright/test";
import fs from "node:fs";

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
const storageState = process.env.E2E_STORAGE_STATE_PATH;
const operationId = process.env.E2E_OPERATION_ID;
const liveRoomId = process.env.E2E_LIVE_ROOM_ID;

const ready = Boolean(baseURL && storageState && operationId && liveRoomId && fs.existsSync(storageState!));

test.describe("Credi production journey — real operation verification", () => {
  test.skip(!ready, "Requires PLAYWRIGHT_BASE_URL, E2E_STORAGE_STATE_PATH, E2E_OPERATION_ID and E2E_LIVE_ROOM_ID.");

  test.use({
    storageState: storageState!,
  });

  test("measures the financial operation from Stripe webhook to wallet and notification", async ({ request }) => {
    const response = await request.get(`/api/operations/${operationId}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);

    const timeline = Array.isArray(body.data?.timeline) ? body.data.timeline : [];
    const types = new Set(timeline.map((event: { event_type?: unknown }) => String(event.event_type ?? "")));

    const required = [
      "order.created",
      "order.status_changed",
      "payment.orchestration",
      "stripe.webhook",
      "affiliate.attribution",
      "affiliate.commission",
      "settlement.allocation",
      "wallet.ledger",
      "notification.emitted",
      "commerce.event",
    ];

    for (const eventType of required) {
      expect(types, `Missing real operation stage: ${eventType}`).toContain(eventType);
    }

    const failures = timeline.filter((event: { status?: unknown }) =>
      ["error", "failed"].includes(String(event.status ?? "")),
    );
    expect(failures, "The operation contains failed/error stages").toHaveLength(0);

    const successfulStripeWebhook = timeline.some(
      (event: { event_type?: unknown; status?: unknown }) =>
        event.event_type === "stripe.webhook" && event.status === "success",
    );
    expect(successfulStripeWebhook).toBe(true);

    expect(body.data?.order_id).toBeTruthy();
  });

  test("measures LIVE transport, replay/media metadata and real-time chat", async ({ request }) => {
    const liveResponse = await request.get("/api/live");
    expect(liveResponse.status()).toBe(200);

    const liveBody = await liveResponse.json();
    const rooms = [...(liveBody.rooms ?? []), ...(liveBody.discovery ?? [])];
    const room = rooms.find((item: { id?: string }) => item.id === liveRoomId);

    expect(room, "Configured E2E LIVE room was not returned by the authenticated LIVE API").toBeTruthy();
    expect(room.status).toMatch(/live|ended/);
    expect(room.stream_provider).toBeTruthy();
    expect(room.playback_url || room.replay_url, "LIVE has no playback/replay URL").toBeTruthy();

    const chatResponse = await request.get(`/api/live/chat?roomId=${liveRoomId}`);
    expect(chatResponse.status()).toBe(200);
    const chatBody = await chatResponse.json();
    expect(Array.isArray(chatBody.messages)).toBe(true);

    const media = Array.isArray(room.cover_media) ? room.cover_media : [];
    for (const asset of media) {
      expect(["image", "video"]).toContain(asset.type);
      const assetResponse = await request.get(String(asset.url));
      expect(assetResponse.status(), `LIVE media failed: ${asset.url}`).toBeLessThan(400);
      const contentType = assetResponse.headers()["content-type"] ?? "";
      if (asset.type === "video") expect(contentType).toMatch(/video|application\/x-mpegURL|application\/vnd\.apple\.mpegurl/);
      if (asset.type === "image") expect(contentType).toMatch(/^image\//);
    }
  });
});
