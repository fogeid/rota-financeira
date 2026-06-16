import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, radius } from '../../theme';
import type { MainStackParamList } from '../../navigation/MainStack';

type Props = NativeStackScreenProps<MainStackParamList, 'PaymentSuccess'>;

const PLAN_LABEL: Record<string, string> = {
  premium_monthly: 'Mensal · R$ 9,90/mês',
  premium_annual: 'Anual · R$ 89,00/ano',
};

const METHOD_LABEL: Record<string, string> = {
  card: 'Cartão de crédito',
  pix: 'PIX',
};

export function PaymentSuccessScreen({ route, navigation }: Props) {
  const { method, planId } = route.params;

  useEffect(() => {
    // Remove payment screens from stack so back-press goes to main app
    const timer = setTimeout(() => {
      navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.screen}>
      <View style={styles.iconWrap}>
        <Ionicons name="checkmark-circle" size={72} color={colors.green} />
      </View>

      <Text style={styles.title}>Assinatura ativada!</Text>
      <Text style={styles.sub}>
        Bem-vindo ao Rota Financeira Pro. Você agora tem acesso completo a todos os recursos.
      </Text>

      <View style={styles.detailCard}>
        <Row label="Plano" value={PLAN_LABEL[planId] ?? planId} />
        <Divider />
        <Row label="Pagamento" value={METHOD_LABEL[method] ?? method} />
        <Divider />
        <Row label="Status" value="Ativo ✓" valueColor={colors.green} />
      </View>

      <View style={styles.featureList}>
        {PRO_FEATURES.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Ionicons name="star" size={14} color={colors.amber} />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.cta}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] })}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>Começar a usar o Pro</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.bg} />
      </TouchableOpacity>

      <Text style={styles.redirect}>Redirecionando automaticamente em 5s…</Text>
    </View>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const PRO_FEATURES = [
  'Sync automático com Uber e 99',
  'Cálculo de IR automático',
  'Relatórios em PDF',
  'Alertas inteligentes',
];

const styles = StyleSheet.create({
  screen: {
    flex: 1, backgroundColor: colors.bg, padding: spacing.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.greenBg, borderWidth: 2, borderColor: colors.greenBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: {
    fontFamily: 'SpaceGrotesk', fontSize: 26, fontWeight: '700',
    color: colors.text, textAlign: 'center', marginBottom: 10,
  },
  sub: {
    ...typography.label, color: colors.text2, textAlign: 'center',
    lineHeight: 22, marginBottom: 24, paddingHorizontal: 8,
  },
  detailCard: {
    backgroundColor: colors.bg3, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 16, width: '100%', marginBottom: 20,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rowLabel: { ...typography.small, color: colors.text2 },
  rowValue: { ...typography.small, color: colors.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  featureList: { gap: 8, width: '100%', marginBottom: 28 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { ...typography.label, color: colors.text2 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.green, borderRadius: radius.sm,
    paddingVertical: 16, width: '100%',
  },
  ctaText: { fontFamily: 'SpaceGrotesk', fontSize: 16, fontWeight: '700', color: colors.bg },
  redirect: { ...typography.small, color: colors.text3, marginTop: 14 },
});
