import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { HomeScreen } from '../screens/main/HomeScreen';
import { GanhosScreen } from '../screens/main/GanhosScreen';
import { CustosScreen } from '../screens/main/CustosScreen';
import { MeuCarroScreen } from '../screens/main/MeuCarroScreen';
import { RelatoriosScreen } from '../screens/main/RelatoriosScreen';
import { PerfilScreen } from '../screens/main/PerfilScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';

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
  Home:       { active: 'home',      inactive: 'home-outline' },
  Ganhos:     { active: 'cash',      inactive: 'cash-outline' },
  Custos:     { active: 'receipt',   inactive: 'receipt-outline' },
  MeuCarro:   { active: 'car',       inactive: 'car-outline' },
  Relatorios: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  Perfil:     { active: 'person',    inactive: 'person-outline' },
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
        tabBarLabelStyle: { fontSize: 9, fontFamily: 'Inter' },
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk', fontSize: 17, fontWeight: '600' },
        headerShadowVisible: false,
      })}
    >
      <Tab.Screen name="Home" options={{ title: 'Início' }}>
        {() => <ErrorBoundary fallbackTitle="Erro na tela Início"><HomeScreen /></ErrorBoundary>}
      </Tab.Screen>
      <Tab.Screen name="Ganhos" options={{ title: 'Ganhos' }}>
        {() => <ErrorBoundary fallbackTitle="Erro na tela Ganhos"><GanhosScreen /></ErrorBoundary>}
      </Tab.Screen>
      <Tab.Screen name="Custos" options={{ title: 'Custos' }}>
        {() => <ErrorBoundary fallbackTitle="Erro na tela Custos"><CustosScreen /></ErrorBoundary>}
      </Tab.Screen>
      <Tab.Screen name="MeuCarro" options={{ title: 'Meu Carro' }}>
        {() => <ErrorBoundary fallbackTitle="Erro na tela Meu Carro"><MeuCarroScreen /></ErrorBoundary>}
      </Tab.Screen>
      <Tab.Screen name="Relatorios" options={{ title: 'Relatórios' }}>
        {() => <ErrorBoundary fallbackTitle="Erro na tela Relatórios"><RelatoriosScreen /></ErrorBoundary>}
      </Tab.Screen>
      <Tab.Screen name="Perfil" options={{ title: 'Perfil' }}>
        {() => <ErrorBoundary fallbackTitle="Erro na tela Perfil"><PerfilScreen /></ErrorBoundary>}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
