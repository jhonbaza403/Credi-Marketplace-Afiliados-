// ==========================================================
// Application Configuration
// ==========================================================


export const APP_CONFIG = {

 name:
  'Credi Marketplace',


 version:
  '1.0.0',


 environment:
  process.env.NODE_ENV
  ??
  'development',


 url:
  process.env.NEXT_PUBLIC_APP_URL
  ??
  'http://localhost:3000',


 supportedLocales:[

  'es',
  'en',
  'pt',
  'fr'

 ] as const,


 defaultLocale:
  'es',


} as const;
