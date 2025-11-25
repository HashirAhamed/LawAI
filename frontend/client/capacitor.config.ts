import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hashir.libraai',
  appName: 'LibraAI',
  webDir: 'dist',
  // Hosted mode (optional): point to your Vercel URL for instant updates.
  // server: { url: 'https://law-ai-sigma-two.vercel.app', cleartext: false },
  android: { allowMixedContent: false }, // keep HTTPS-only
};

export default config;
