import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), usb=(), payment=()",
  },
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
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://images.pexels.com https://*.cloudflarestream.com https://*.amazonaws.com https://*.cloudfront.net https://*.vimeo.com https://i.ytimg.com https://yt3.ggpht.com https://lh3.googleusercontent.com https://res.cloudinary.com https://cdn.shopify.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://api.stripe.com https://*.twilio.com https://business.coinbase.com https://www.youtube.com https://*.cloudflarestream.com https://*.vimeo.com https://*.amazonaws.com https://*.cloudfront.net",
  "frame-src 'self' https://*.supabase.co https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://iframe.videodelivery.net",
  "media-src 'self' blob: data: https://*.supabase.co https://*.cloudflarestream.com https://videodelivery.net https://*.videodelivery.net https://www.youtube.com https://www.youtube-nocookie.com https://*.vimeo.com https://*.amazonaws.com https://*.cloudfront.net https://res.cloudinary.com",
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
      { protocol: "https", hostname: "*.supabase.co", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "images.pexels.com", pathname: "/**" },
      { protocol: "https", hostname: "*.cloudflarestream.com", pathname: "/**" },
      { protocol: "https", hostname: "*.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "*.cloudfront.net", pathname: "/**" },
      { protocol: "https", hostname: "*.vimeo.com", pathname: "/**" },
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/**" },
      { protocol: "https", hostname: "yt3.ggpht.com", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.shopify.com", pathname: "/**" },
    ],
  },
  async redirects() {
    return [
      { source: "/inicio", destination: "/", permanent: true },
      { source: "/muro", destination: "/social", permanent: true },
      { source: "/seller", destination: "/seller/dashboard", permanent: false },
      { source: "/seller/b2b", destination: "/b2b", permanent: false },
      { source: "/seller/b2b/:path*", destination: "/b2b/:path*", permanent: false },
      { source: "/jobs", destination: "/marketplace", permanent: false },
      { source: "/jobs/:path*", destination: "/marketplace/:path*", permanent: false },
      { source: "/explorar", destination: "/marketplace", permanent: false },
      { source: "/servicios", destination: "/marketplace", permanent: false },
      { source: "/servicios/:path*", destination: "/marketplace/:path*", permanent: false },
      { source: "/productos", destination: "/marketplace", permanent: false },
      { source: "/productos/:path*", destination: "/marketplace/:path*", permanent: false },
      { source: "/ads", destination: "/marketing", permanent: false },
      { source: "/publicidad", destination: "/marketing", permanent: false },
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
