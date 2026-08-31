```typescript
// ==========================================================
// ARCHIVO:
// next.config.ts
//
// Credi Marketplace
//
// Next.js 16.3.3
// React 19.2.8
// TypeScript 7.0.2
//
// Configuración principal de Next.js
// Seguridad HTTP
// CSP
// Imágenes
// Producción
// ==========================================================

import type { NextConfig } from "next";

// ==========================================================
// HEADERS DE SEGURIDAD
// ==========================================================

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },

  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },

  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), usb=(), payment=()",
  },

  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },

  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },

  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },

  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
];

// ==========================================================
// CONTENT SECURITY POLICY
// ==========================================================
//
// IMPORTANTE:
//
// No se utiliza `unsafe-eval`.
//
// `unsafe-inline` permanece solamente porque Next.js puede
// requerir estilos/scripts inline dependiendo de la aplicación.
//
// La CSP debe ajustarse posteriormente a los servicios reales
// utilizados por Credi Marketplace.
// ==========================================================

const contentSecurityPolicy = [
  "default-src 'self'",

  "base-uri 'self'",

  "form-action 'self'",

  "frame-ancestors 'self'",

  "object-src 'none'",

  "script-src 'self' 'unsafe-inline'",

  "style-src 'self' 'unsafe-inline'",

  "img-src 'self' data: blob: https:",

  "font-src 'self' data: https:",

  [
    "connect-src",
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https:",
  ].join(" "),

  [
    "frame-src",
    "'self'",
    "https://*.supabase.co",
  ].join(" "),

  "manifest-src 'self'",

  "worker-src 'self' blob:",

  "media-src 'self' blob: https:",

  "upgrade-insecure-requests",
].join("; ");

// ==========================================================
// NEXT CONFIG
// ==========================================================

const nextConfig: NextConfig = {
  // --------------------------------------------------------
  // React
  // --------------------------------------------------------

  reactStrictMode: true,

  // --------------------------------------------------------
  // Seguridad / información del servidor
  // --------------------------------------------------------

  poweredByHeader: false,

  // --------------------------------------------------------
  // Compresión
  // --------------------------------------------------------

  compress: true,

  // --------------------------------------------------------
  // Source maps
  // --------------------------------------------------------
  //
  // No generar source maps del navegador en producción.
  //

  productionBrowserSourceMaps: false,

  // --------------------------------------------------------
  // ETag
  // --------------------------------------------------------

  generateEtags: true,

  // --------------------------------------------------------
  // Trailing slash
  // --------------------------------------------------------

  trailingSlash: false,

  // --------------------------------------------------------
  // Deployment
  // --------------------------------------------------------

  output: "standalone",

  // --------------------------------------------------------
  // TypeScript
  // --------------------------------------------------------
  //
  // Los errores de TypeScript deben detener el build.
  //

  typescript: {
    ignoreBuildErrors: false,
  },

  // --------------------------------------------------------
  // Imágenes
  // --------------------------------------------------------

  images: {
    formats: [
      "image/avif",
      "image/webp",
    ],

    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },

      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  // --------------------------------------------------------
  // HEADERS
  // --------------------------------------------------------

  async headers() {
    return [
      // ====================================================
      // TODA LA APLICACIÓN
      // ====================================================

      {
        source: "/:path*",

        headers: [
          ...securityHeaders,

          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },

      // ====================================================
      // API
      // ====================================================

      {
        source: "/api/:path*",

        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0",
          },

          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },

          {
            key: "X-Frame-Options",
            value: "DENY",
          },

          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
        ],
      },

      // ====================================================
      // ADMINISTRACIÓN
      // ====================================================

      {
        source: "/admin/:path*",

        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0",
          },

          {
            key: "X-Frame-Options",
            value: "DENY",
          },

          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
        ],
      },

      // ====================================================
      // DASHBOARD ADMINISTRATIVO
      // ====================================================

      {
        source: "/dashboard/admin/:path*",

        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0",
          },

          {
            key: "X-Frame-Options",
            value: "DENY",
          },

          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

// ==========================================================
// EXPORT
// ==========================================================

export default nextConfig;
```
