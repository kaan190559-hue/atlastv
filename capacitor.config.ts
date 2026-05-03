import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.atlastv.app',
  appName: 'AtlasTv',
  webDir: 'dist',
  server: {
    // Keeps the Render connection — loads live backend in the Android WebView
    url: 'https://atlastv.onrender.com',
    cleartext: false,
  },
  android: {
    backgroundColor: '#0a0a0f',
  },
}

export default config
