import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Motorista Rico',
  slug: 'motorista-rico',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'app.motoristarico',
  },
  android: {
    package: 'app.motoristarico',
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#0F1117',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    '@sentry/react-native',
    'expo-secure-store',
    'expo-sharing',
    'expo-splash-screen',
  ],
  extra: {
    apiUrl: process.env.API_URL ?? 'http://localhost:3000',
    pagarmePublicKey: process.env.PAGARME_PUBLIC_KEY ?? '',
    firebaseWebApiKey: process.env.FIREBASE_WEB_API_KEY ?? '',
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '',
    },
  },
  updates: {
    fallbackToCacheTimeout: 0,
    url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID ?? ''}`,
  },
  runtimeVersion: { policy: 'sdkVersion' },
});
