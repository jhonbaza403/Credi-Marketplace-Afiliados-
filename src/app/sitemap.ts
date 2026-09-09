import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/app-url";

const PUBLIC_ROUTES = [
  "/",
  "/marketplace",
  "/products",
  "/services",
  "/b2b",
  "/jobs",
  "/magazines",
  "/sellers",
  "/videos",
  "/affiliate",
  "/account",
  "/orders",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getAppUrl();

  return PUBLIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: "daily" as const,
    priority: route === "/" ? 1 : 0.8,
  }));
}
