import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { colors, typography } from '../../theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props) {
  const initialize = useAuthStore((s) => s.initialize);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    initialize().then(() => {
      // Navigation handled by RootNavigator based on isAuthenticated
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Rota</Text>
      <Text style={styles.logoAccent}>Financeira</Text>
      <ActivityIndicator
        color={colors.green}
        size="large"
        style={styles.spinner}
      />
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
