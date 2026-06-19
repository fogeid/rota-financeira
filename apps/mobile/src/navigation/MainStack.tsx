import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { MainNavigator } from './MainNavigator';
import { UpgradeScreen } from '../screens/main/UpgradeScreen';
import { PaymentScreen } from '../screens/main/PaymentScreen';
import { CartaoScreen } from '../screens/main/CartaoScreen';
import { PixScreen } from '../screens/main/PixScreen';
import { PaymentSuccessScreen } from '../screens/main/PaymentSuccessScreen';
import { ImportCSVScreen } from '../screens/integrations/ImportCSVScreen';

export type MainStackParamList = {
  Tabs: undefined;
  Upgrade: undefined;
  Payment: { planId: 'premium_monthly' | 'premium_yearly' };
  Cartao: { planId: 'premium_monthly' | 'premium_yearly' };
  Pix: { planId: 'premium_yearly' };
  PaymentSuccess: { method: 'card' | 'pix'; planId: string };
  ImportCSV: { platform: string };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

const STACK_SCREEN_OPTIONS = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerTitleStyle: { fontFamily: 'SpaceGrotesk', fontSize: 17, fontWeight: '600' as const },
  headerShadowVisible: false,
};

export function MainStack() {
  return (
    <Stack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="Tabs" component={MainNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="Upgrade" component={UpgradeScreen} options={{ title: 'Assinar Pro' }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Forma de pagamento' }} />
      <Stack.Screen name="Cartao" component={CartaoScreen} options={{ title: 'Dados do cartão' }} />
      <Stack.Screen name="Pix" component={PixScreen} options={{ title: 'Pagar com PIX' }} />
      <Stack.Screen
        name="PaymentSuccess"
        component={PaymentSuccessScreen}
        options={{ title: 'Assinatura ativada', headerLeft: () => null, gestureEnabled: false }}
      />
      <Stack.Screen
        name="ImportCSV"
        component={ImportCSVScreen}
        options={{ title: 'Importar histórico' }}
      />
    </Stack.Navigator>
  );
}
