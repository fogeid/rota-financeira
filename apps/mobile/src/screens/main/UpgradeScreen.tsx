import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, radius } from '../../theme';
import { AlertBox } from '../../components';
import type { MainStackParamList } from '../../navigation/MainStack';

type Plan = 'monthly' | 'annual';

const PLANS: Record<Plan, { id: 'premium_monthly' | 'premium_yearly'; label: string; price: string; sub: string; saving?: string }> = {
  monthly: { id: 'premium_monthly',  label: 'Mensal', price: 'R$ 9,90',  sub: 'por mês', },
  annual:  { id: 'premium_yearly',   label: 'Anual',  price: 'R$ 89,00', sub: 'por ano', saving: 'Economize 25%' },
};

const FREE_FEATURES = [
  'Registro manual de corridas',
  'Controle de custos',
  'Meta diária e progresso',
  'Lucro líquido do dia',
  'Histórico completo',
];

const PRO_FEATURES = [
  { label: 'Tudo do Gratuito', included: true },
  { label: 'Sync automático Uber e 99', included: true },
  { label: 'Cálculo de IR automático', included: true },
  { label: 'Exportar relatórios em PDF', included: true },
  { label: 'Alertas inteligentes por push', included: true },
  { label: 'Projeções do próximo mês', included: true },
  { label: 'Custo/km automático', included: true },
  { label: 'Planejamento de troca do veículo', included: true },
];

type Props = NativeStackScreenProps<MainStackParamList, 'Upgrade'>;

export function UpgradeScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<Plan>('annual');

  function handleSubscribe() {
    navigation.navigate('Payment', { planId: PLANS[selected].id });
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="star" size={32} color={colors.amber} />
        </View>
        <Text style={styles.heroTitle}>Rota Financeira Pro</Text>
        <Text style={styles.heroSub}>
          Automação completa para motoristas que levam o financeiro a sério.
        </Text>
      </View>

      {/* Plan selector */}
      <View style={styles.planRow}>
        {(Object.entries(PLANS) as [Plan, typeof PLANS[Plan]][]).map(([key, plan]) => (
          <TouchableOpacity
            key={key}
            style={[styles.planCard, selected === key && styles.planCardActive]}
            onPress={() => setSelected(key)}
            activeOpacity={0.85}
          >
            {plan.saving && (
              <View style={styles.savingBadge}>
                <Text style={styles.savingText}>{plan.saving}</Text>
              </View>
            )}
            <Text style={[styles.planLabel, selected === key && { color: colors.amber }]}>{plan.label}</Text>
            <Text style={[styles.planPrice, selected === key && { color: colors.text }]}>{plan.price}</Text>
            <Text style={styles.planSub}>{plan.sub}</Text>
            {selected === key && (
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark-circle" size={18} color={colors.amber} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Feature comparison */}
      <View style={styles.comparison}>
        <View style={styles.comparisonCol}>
          <Text style={styles.comparisonHeader}>Gratuito</Text>
          {FREE_FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark" size={14} color={colors.text3} />
              <Text style={styles.featureTextFree}>{f}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.comparisonCol, styles.comparisonColPro]}>
          <Text style={[styles.comparisonHeader, { color: colors.amber }]}>Pro ⭐</Text>
          {PRO_FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.amber} />
              <Text style={styles.featureTextPro}>{f.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <AlertBox
        variant="blue"
        icon="🔒"
        message="Pagamento seguro via Pagar.me. Cancele quando quiser. Sem taxas escondidas."
        style={{ marginTop: 16 }}
      />

      {/* CTA */}
      <TouchableOpacity style={styles.cta} onPress={handleSubscribe} activeOpacity={0.85}>
        <Ionicons name="star" size={18} color={colors.bg} />
        <Text style={styles.ctaText}>
          Assinar {PLANS[selected].label} por {PLANS[selected].price}
        </Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        {selected === 'annual'
          ? 'Cobrança única de R$ 89,00/ano. Renovação automática.'
          : 'Cobrança recorrente de R$ 9,90/mês. Cancele a qualquer momento.'}
      </Text>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 8 },
  hero: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  heroIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.amberBg, borderWidth: 2, borderColor: colors.amberBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontFamily: 'SpaceGrotesk', fontSize: 26, fontWeight: '700', color: colors.text },
  heroSub: { ...typography.label, color: colors.text2, textAlign: 'center', lineHeight: 20 },
  planRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  planCard: {
    flex: 1, backgroundColor: colors.bg3, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 16, alignItems: 'center', gap: 4, position: 'relative',
  },
  planCardActive: { backgroundColor: colors.amberBg, borderColor: colors.amberBorder },
  planLabel: { ...typography.small, color: colors.text3, fontWeight: '600', textTransform: 'uppercase' },
  planPrice: { fontFamily: 'SpaceGrotesk', fontSize: 22, fontWeight: '700', color: colors.text2 },
  planSub: { ...typography.micro, color: colors.text3 },
  savingBadge: {
    position: 'absolute', top: -10, right: -4,
    backgroundColor: colors.green, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.full,
  },
  savingText: { ...typography.micro, color: colors.bg, fontWeight: '700' },
  checkIcon: { position: 'absolute', top: 10, left: 10 },
  comparison: { flexDirection: 'row', gap: 12 },
  comparisonCol: {
    flex: 1, backgroundColor: colors.bg3, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 14, gap: 10,
  },
  comparisonColPro: { backgroundColor: colors.amberBg, borderColor: colors.amberBorder },
  comparisonHeader: {
    fontFamily: 'SpaceGrotesk', fontSize: 14, fontWeight: '700',
    color: colors.text3, marginBottom: 4,
  },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  featureTextFree: { ...typography.small, color: colors.text3, flex: 1 },
  featureTextPro: { ...typography.small, color: colors.text, flex: 1 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.amber, borderRadius: radius.sm, paddingVertical: 16, marginTop: 20,
  },
  ctaText: { fontFamily: 'SpaceGrotesk', fontSize: 16, fontWeight: '700', color: colors.bg },
  disclaimer: { ...typography.small, color: colors.text3, textAlign: 'center', marginTop: 10 },
});
