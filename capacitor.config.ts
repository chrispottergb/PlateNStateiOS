import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.platenstate.myapp',
  appName: 'Plate N\' State',
  webDir: 'dist',
  // server block only active in local dev (hot-reload from Lovable sandbox).
  // Remove or leave empty for release builds — app will load from bundled dist/.
  ...(isDev && {
    server: {
      url: 'https://8d04b41e-8233-4288-b74d-acb66aee32f6.lovableproject.com?forceHideBadge=true',
      cleartext: true,
    },
  }),
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0F172A',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0F172A',
    },
    Camera: {
      // iOS — injected into Info.plist by `npx cap sync`
      NSCameraUsageDescription: 'Plate N\' State uses the camera to scan license plates.',
      NSPhotoLibraryUsageDescription: 'Plate N\' State reads photos from your library to scan license plates.',
      NSPhotoLibraryAddUsageDescription: 'Plate N\' State saves plate photos to your library.',
    },
    Geolocation: {
      // iOS — injected into Info.plist by `npx cap sync`
      NSLocationWhenInUseUsageDescription: 'Plate N\' State uses your location to attach a location to reports.',
    },
  },
  android: {
    buildOptions: {
      keystorePath: 'platenstate.jks',
      keystoreAlias: 'platenstate',
    },
  },
};

export default config;
