import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/app-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard/", "/admin/", "/account/", "/checkout/", "/api/", "/auth/", "/_next/"] }],
    sitemap: `${getAppUrl()}/sitemap.xml`,
  };
}
