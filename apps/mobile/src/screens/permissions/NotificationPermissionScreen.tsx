import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { AlertBox, ConfirmButton } from '../../components';
import { NotificationListener } from '../../../../modules/notification-listener/src';

interface Props {
  onGranted: () => void;
  onSkip: () => void;
}

export function NotificationPermissionScreen({ onGranted, onSkip }: Props) {
  const [checking, setChecking] = useState(false);

  function requestPermission() {
    NotificationListener.openPermissionSettings();
  }

  // Verificar quando o app volta do segundo plano (usuário voltou das configurações)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setChecking(true);
        setTimeout(() => {
          if (NotificationListener.isPermissionGranted()) {
            onGranted();
          }
          setChecking(false);
        }, 500);
      }
    });
    return () => sub.remove();
  }, [onGranted]);

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="notifications-outline" size={48} color={colors.green} />
      </View>

      <Text style={styles.title}>Captura automática de corridas</Text>
      <Text style={styles.subtitle}>
        Registre suas corridas automaticamente assim que concluí-las no Uber ou 99.
      </Text>

      <AlertBox
        variant="blue"
        message={
          'O Rota Financeira lê apenas as notificações do Uber Driver e 99 para Motoristas.\n\n' +
          'WhatsApp, e-mail e outros apps são completamente ignorados.'
        }
        style={{ marginBottom: spacing.md }}
      />

      <ConfirmButton
        label={checking ? 'Verificando...' : 'Permitir notificações'}
        onPress={requestPermission}
        loading={checking}
        style={{ marginBottom: 12 }}
      />

      <TouchableOpacity onPress={onSkip} style={styles.skip}>
        <Text style={styles.skipText}>Prefiro registrar manualmente</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.greenBg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...typography.label,
    color: colors.text2,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  skip: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    ...typography.label,
    color: colors.text3,
  },
});
