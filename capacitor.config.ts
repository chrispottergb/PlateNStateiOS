import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.platenstate.app',
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
      NSCameraUsageDescription: 'Plate N\' State uses the camera to scan license plates.',
      NSPhotoLibraryUsageDescription: 'Plate N\' State reads photos from your library to scan license plates.',
      NSPhotoLibraryAddUsageDescription: 'Plate N\' State saves plate photos to your library.',
    },
    Geolocation: {
      NSLocationWhenInUseUsageDescription: 'Plate N\' State uses your location to attach a location to reports.',
    },
  },
  ios: {
    scheme: 'PlateNState',
    contentInset: 'automatic',
    backgroundColor: '#0F172A',
  },
};

export default config;
