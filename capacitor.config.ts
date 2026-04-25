import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.8d04b41e82334288b74dacb66aee32f6',
  appName: 'platenstate',
  webDir: 'dist',
  server: {
    url: 'https://8d04b41e-8233-4288-b74d-acb66aee32f6.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0F172A',
      showSpinner: false,
    },
  },
};

export default config;
