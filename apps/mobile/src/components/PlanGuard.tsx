import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '../theme';
import { BottomSheet } from './BottomSheet';
import { useSubscriptionStore } from '../store/subscriptionStore';

interface PlanGuardSheetProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  featureName?: string;
}

export function PlanGuardSheet({ visible, onClose, onUpgrade, featureName }: PlanGuardSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="star" size={28} color={colors.amber} />
        </View>
        <Text style={styles.title}>Funcionalidade Premium</Text>
        <Text style={styles.sub}>
          {featureName
            ? `${featureName} é exclusivo do Plano Premium.`
            : 'Esta funcionalidade é exclusiva do Plano Premium.'}{' '}
          Assine por apenas R$ 9,90/mês.
        </Text>

        <View style={styles.featureList}>
          {PREMIUM_FEATURES.map((f) => (
            <View key={f} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.green} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade} activeOpacity={0.85}>
          <Ionicons name="star" size={16} color={colors.bg} />
          <Text style={styles.upgradeBtnText}>Assinar Premium</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.75}>
          <Text style={styles.cancelBtnText}>Agora não</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const PREMIUM_FEATURES = [
  'Sync automático Uber e 99',
  'Cálculo de IR automático',
  'Exportar relatórios em PDF',
  'Alertas inteligentes por push',
  'Projeções do próximo mês',
];

export function usePlanGuard() {
  const isPro = useSubscriptionStore((s) => s.isPro());
  const [guardVisible, setGuardVisible] = useState(false);
  const [featureName, setFeatureName] = useState<string | undefined>();

  function guard(action: () => void, feature?: string): void {
    if (isPro) {
      action();
    } else {
      setFeatureName(feature);
      setGuardVisible(true);
    }
  }

  return { isPro, guardVisible, featureName, setGuardVisible, guard };
}

const styles = StyleSheet.create({
  content: { paddingBottom: 8 },
  iconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.amberBg, borderWidth: 1, borderColor: colors.amberBorder,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16,
  },
  title: {
    fontFamily: 'SpaceGrotesk', fontSize: 20, fontWeight: '700',
    color: colors.text, textAlign: 'center', marginBottom: 8,
  },
  sub: {
    ...typography.label, color: colors.text2, textAlign: 'center',
    lineHeight: 20, marginBottom: 20,
  },
  featureList: { gap: 10, marginBottom: 24 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { ...typography.label, color: colors.text },
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.amber, borderRadius: radius.sm, paddingVertical: 14,
    marginBottom: 10,
  },
  upgradeBtnText: { fontFamily: 'SpaceGrotesk', fontSize: 15, fontWeight: '700', color: colors.bg },
  cancelBtn: {
    alignItems: 'center', paddingVertical: 12,
    backgroundColor: colors.bg3, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  cancelBtnText: { ...typography.label, color: colors.text2 },
});
