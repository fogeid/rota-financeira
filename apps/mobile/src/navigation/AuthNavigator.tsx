import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterStep1Screen } from '../screens/auth/RegisterStep1Screen';
import { OTPScreen } from '../screens/auth/OTPScreen';
import { RegisterStep2Screen } from '../screens/auth/RegisterStep2Screen';
import { RegisterStep3Screen } from '../screens/auth/RegisterStep3Screen';
import { RegisterStep4Screen } from '../screens/auth/RegisterStep4Screen';
import { ConnectPlatformScreen } from '../screens/auth/ConnectPlatformScreen';
import { TutorialScreen } from '../screens/auth/TutorialScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  RegisterStep1: undefined;
  OTP: {
    phone: string;
    purpose: 'REGISTRATION' | 'PASSWORD_RESET';
    name?: string;
    cpf?: string;
  };
  RegisterStep2: { phone: string; name: string; cpf: string };
  RegisterStep3: { phone: string; name: string; cpf: string; email: string; password: string };
  RegisterStep4: {
    phone: string;
    name: string;
    cpf: string;
    email: string;
    password: string;
    plate: string;
    brand: string;
    model: string;
    year: number;
    fuel_efficiency: number;
  };
  ConnectPlatform: undefined;
  Tutorial: undefined;
  ForgotPassword: undefined;
  ResetPassword: { phone: string; code: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerTitleStyle: { fontFamily: 'SpaceGrotesk', fontSize: 17, fontWeight: '600' as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RegisterStep1" component={RegisterStep1Screen} options={{ title: 'Cadastro' }} />
      <Stack.Screen name="OTP" component={OTPScreen} options={{ title: 'Verificação' }} />
      <Stack.Screen name="RegisterStep2" component={RegisterStep2Screen} options={{ title: 'Acesso' }} />
      <Stack.Screen name="RegisterStep3" component={RegisterStep3Screen} options={{ title: 'Veículo' }} />
      <Stack.Screen name="RegisterStep4" component={RegisterStep4Screen} options={{ title: 'Financiamento' }} />
      <Stack.Screen name="ConnectPlatform" component={ConnectPlatformScreen} options={{ title: 'Plataformas' }} />
      <Stack.Screen name="Tutorial" component={TutorialScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Recuperar senha' }} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Nova senha' }} />
    </Stack.Navigator>
  );
}
