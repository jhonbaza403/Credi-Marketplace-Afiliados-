"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function VercelTelemetry() {
  return (
    <>
      <Analytics
        beforeSend={(event) => {
          const pathname = new URL(event.url).pathname;
          if (pathname.startsWith("/admin") || pathname.startsWith("/api/")) {
            return null;
          }
          return event;
        }}
      />
      <SpeedInsights />
    </>
  );
}
