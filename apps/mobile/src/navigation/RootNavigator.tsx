import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { MainStack } from './MainStack';

const NAV_THEME = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2ECC8A',
    background: '#0F1117',
    card: '#1E2130',
    text: '#F0F2F8',
    border: 'rgba(255,255,255,0.07)',
    notification: '#F25C5C',
  },
};

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  // While initializing SecureStore check, show nothing (SplashScreen handles it)
  return (
    <NavigationContainer theme={NAV_THEME}>
      {isAuthenticated ? <MainStack /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
