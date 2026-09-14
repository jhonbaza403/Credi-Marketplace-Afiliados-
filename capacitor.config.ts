import type { CapacitorConfig } from '@capacitor/cli'

const productionUrl = 'https://credi-marketplace-afiliados.vercel.app'
const serverUrl = (process.env.CAPACITOR_SERVER_URL || productionUrl).replace(/\/$/, '')

const config: CapacitorConfig = {
  appId: 'com.credimarketplace.app',
  appName: 'Credi Marketplace',
  webDir: 'mobile',
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#050816',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1200,
      backgroundColor: '#050816',
    },
  },
}

export default config
