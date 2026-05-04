import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.atlastv.tv',
  appName: 'AtlasTv TV',
  webDir: 'dist',
  server: {
    url: 'https://atlastv.onrender.com?deviceOverride=tv',
    cleartext: false,
  },
  android: {
    backgroundColor: '#0a0a0f',
  },
}

export default config
