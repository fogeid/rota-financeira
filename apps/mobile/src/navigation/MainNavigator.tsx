import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme';
import { HomeScreen } from '../screens/main/HomeScreen';
import { PlaceholderScreen } from '../screens/main/PlaceholderScreen';

export type MainTabParamList = {
  Home: undefined;
  Ganhos: undefined;
  Custos: undefined;
  MeuCarro: undefined;
  Relatorios: undefined;
  Perfil: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof MainTabParamList, { active: IoniconName; inactive: IoniconName }> = {
  Home:       { active: 'home',              inactive: 'home-outline' },
  Ganhos:     { active: 'cash',              inactive: 'cash-outline' },
  Custos:     { active: 'receipt',           inactive: 'receipt-outline' },
  MeuCarro:   { active: 'car',               inactive: 'car-outline' },
  Relatorios: { active: 'bar-chart',         inactive: 'bar-chart-outline' },
  Perfil:     { active: 'person',            inactive: 'person-outline' },
};

const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  Home: 'Home',
  Ganhos: 'Ganhos',
  Custos: 'Custos',
  MeuCarro: 'Meu Carro',
  Relatorios: 'Relatórios',
  Perfil: 'Perfil',
};

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, size }) => {
          const icons = TAB_ICONS[route.name as keyof MainTabParamList];
          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={size}
              color={focused ? colors.green : colors.text3}
            />
          );
        },
        tabBarLabel: TAB_LABELS[route.name as keyof MainTabParamList],
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.text3,
        tabBarStyle: {
          backgroundColor: 'rgba(15,17,23,0.95)',
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 82 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontFamily: 'Inter',
        },
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontFamily: 'SpaceGrotesk',
          fontSize: 17,
          fontWeight: '600',
        },
        headerShadowVisible: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Início' }} />
      <Tab.Screen
        name="Ganhos"
        children={() => <PlaceholderScreen title="Ganhos" />}
      />
      <Tab.Screen
        name="Custos"
        children={() => <PlaceholderScreen title="Custos" />}
      />
      <Tab.Screen
        name="MeuCarro"
        options={{ title: 'Meu Carro' }}
        children={() => <PlaceholderScreen title="Meu Carro" />}
      />
      <Tab.Screen
        name="Relatorios"
        options={{ title: 'Relatórios' }}
        children={() => <PlaceholderScreen title="Relatórios" />}
      />
      <Tab.Screen
        name="Perfil"
        children={() => <PlaceholderScreen title="Perfil" />}
      />
    </Tab.Navigator>
  );
}
