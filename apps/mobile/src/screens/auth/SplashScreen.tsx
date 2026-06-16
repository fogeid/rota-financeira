import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props) {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isLoading) {
      // isAuthenticated === true → RootNavigator already switched to MainNavigator
      // isAuthenticated === false → navigate to Login within AuthNavigator
      if (!isAuthenticated) {
        navigation.replace('Login');
      }
    }
  }, [isLoading, isAuthenticated]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Rota</Text>
      <Text style={styles.logoAccent}>Financeira</Text>
      <ActivityIndicator color={colors.green} size="large" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 40,
    fontWeight: '700',
    color: colors.text,
  },
  logoAccent: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 40,
    fontWeight: '700',
    color: colors.green,
    marginTop: -8,
  },
  spinner: {
    marginTop: 48,
  },
});
