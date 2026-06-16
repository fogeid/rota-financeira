import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Rota Financeira',
  slug: 'rota-financeira',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'app.rotafinanceira.mobile',
  },
  android: {
    package: 'app.rotafinanceira.mobile',
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
