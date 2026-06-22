import * as Sentry from '@sentry/react-native';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { RootNavigator } from './src/navigation/RootNavigator';
import { QueryProvider } from './src/providers/QueryProvider';
import { useAuthStore } from './src/store/authStore';
import { useNotificationListener } from './src/hooks/useNotificationListener';

// Inicializa Sentry antes de qualquer render — docs/02-TECH-STACK.md seção 3
if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

SplashScreen.preventAutoHideAsync();

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  useNotificationListener();

  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    SpaceGrotesk: SpaceGrotesk_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      initialize().finally(() => SplashScreen.hideAsync());
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryProvider>
  );
}
