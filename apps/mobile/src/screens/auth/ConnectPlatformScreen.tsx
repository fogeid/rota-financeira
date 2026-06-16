import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { ConfirmButton, AlertBox, Card } from '../../components';
import { colors, spacing, typography, radius } from '../../theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Platform = 'UBER' | 'NOVENTA_NOVE';
type Props = NativeStackScreenProps<AuthStackParamList, 'ConnectPlatform'>;

const PLATFORMS = [
  { id: 'UBER' as Platform, label: 'Uber', color: '#000000', icon: 'car-outline' as const },
  { id: 'NOVENTA_NOVE' as Platform, label: '99', color: '#F9A825', icon: 'car-sport-outline' as const },
];

export function ConnectPlatformScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<Platform[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle(id: Platform) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  async function handleConnect() {
    if (selected.length === 0) {
      navigation.navigate('Tutorial');
      return;
    }
    setLoading(true);
    try {
      for (const platform of selected) {
        await api.post('/integrations', { platform });
      }
      navigation.navigate('Tutorial');
    } catch {
      setApiError('Não foi possível conectar as plataformas. Você pode fazer isso depois no Perfil.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Conectar plataformas</Text>
      <Text style={styles.sub}>
        Sincronize seus ganhos automaticamente. Você pode fazer isso depois também.
      </Text>

      {apiError ? <AlertBox variant="amber" message={apiError} style={styles.alert} /> : null}

      <AlertBox
        variant="blue"
        message="Suas credenciais são criptografadas e nunca compartilhadas com terceiros."
        style={styles.alert}
      />

      {PLATFORMS.map((p) => {
        const isSelected = selected.includes(p.id);
        return (
          <TouchableOpacity
            key={p.id}
            activeOpacity={0.85}
            onPress={() => toggle(p.id)}
            style={[styles.platformCard, isSelected && styles.platformCardActive]}
          >
            <View style={[styles.iconCircle, { backgroundColor: p.color }]}>
              <Ionicons name={p.icon} size={28} color="#fff" />
            </View>
            <Text style={styles.platformLabel}>{p.label}</Text>
            <View style={[styles.check, isSelected && styles.checkActive]}>
              {isSelected ? (
                <Ionicons name="checkmark" size={16} color={colors.bg} />
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}

      <ConfirmButton
        label={selected.length > 0 ? 'Conectar e continuar' : 'Pular por agora'}
        onPress={handleConnect}
        loading={loading}
        style={styles.btn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 40, flexGrow: 1 },
  title: { fontFamily: 'SpaceGrotesk', fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 8 },
  sub: { ...typography.body, color: colors.text2, marginBottom: 24 },
  alert: { marginBottom: spacing.md },
  platformCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  platformCardActive: {
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenBg,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformLabel: {
    flex: 1,
    fontFamily: 'SpaceGrotesk',
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  btn: { marginTop: spacing.xl },
});
