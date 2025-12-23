import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'art.haniipp.opensketch',
  appName: 'OpenSketch',
  webDir: 'out',
  server: {
    // Load live site directly inside the app (Online URL mode)
    url: 'https://art.haniipp.space',
    cleartext: false,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
