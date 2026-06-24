import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.plateandstate.platenstate',
  appName: 'Plate N\' State',
  webDir: 'dist',
  ...(isDev && {
    server: {
      url: 'http://localhost:8080',
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
