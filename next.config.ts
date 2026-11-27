import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), usb=(), payment=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://js.stripe.com${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://*.cloudflarestream.com https://videodelivery.net https://*.videodelivery.net https://images.unsplash.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.livekit.cloud wss://*.livekit.cloud https://*.cloudflarestream.com https://videodelivery.net https://*.videodelivery.net https://generativelanguage.googleapis.com https://api.stripe.com https://*.twilio.com https://business.coinbase.com",
  "media-src 'self' blob: data: https://*.cloudflarestream.com https://videodelivery.net https://*.videodelivery.net",
  "frame-src 'self' https://*.supabase.co https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com https://*.cloudflarestream.com https://videodelivery.net https://*.videodelivery.net",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  ...(isDevelopment ? { allowedDevOrigins: ["127.0.0.1", "localhost"] } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/inicio", destination: "/", permanent: true },
      { source: "/muro", destination: "/social", permanent: true },
      { source: "/seller", destination: "/sellers", permanent: true },
      { source: "/seller/b2b", destination: "/b2b", permanent: true },
      { source: "/seller/b2b/:path*", destination: "/b2b/:path*", permanent: true },
      { source: "/jobs", destination: "/services", permanent: true },
      { source: "/jobs/:path*", destination: "/services/:path*", permanent: true },
      { source: "/explorar", destination: "/marketplace", permanent: true },
      { source: "/servicios", destination: "/services", permanent: true },
      { source: "/servicios/:path*", destination: "/services/:path*", permanent: true },
      { source: "/productos", destination: "/products", permanent: true },
      { source: "/ads", destination: "/marketing", permanent: true },
      { source: "/publicidad", destination: "/marketing", permanent: true },
      { source: "/productos/:path*", destination: "/products/:path*", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
