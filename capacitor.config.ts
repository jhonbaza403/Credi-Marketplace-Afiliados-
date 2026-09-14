import type { CapacitorConfig } from '@capacitor/cli'

const productionUrl = 'https://credi-marketplace-afiliados.vercel.app'
const serverUrl = (process.env.CAPACITOR_SERVER_URL || productionUrl).replace(/\/$/, '')

const config: CapacitorConfig = {
  appId: 'com.credimarketplace.app',
  appName: 'Credi Marketplace',
  webDir: 'mobile',
  loggingBehavior: 'none',
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: [
      'credi-marketplace-afiliados.vercel.app',
      '*.supabase.co',
    ],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#050816',
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1200,
      backgroundColor: '#050816',
      showSpinner: false,
    },
  },
}

export default config
