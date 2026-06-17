import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, radius } from '../../theme';
import type { MainStackParamList } from '../../navigation/MainStack';

type Props = NativeStackScreenProps<MainStackParamList, 'Payment'>;

const PRICE_LABEL: Record<string, string> = {
  premium_monthly: 'R$ 9,90/mês',
  premium_yearly: 'R$ 89,00/ano',
};

export function PaymentScreen({ route, navigation }: Props) {
  const { planId } = route.params;
  const isAnnual = planId === 'premium_yearly';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Forma de pagamento</Text>
        <Text style={styles.sub}>Plano: {PRICE_LABEL[planId] ?? planId}</Text>
      </View>

      <TouchableOpacity
        style={styles.methodCard}
        onPress={() => navigation.navigate('Cartao', { planId })}
        activeOpacity={0.85}
      >
        <View style={styles.methodIcon}>
          <Ionicons name="card-outline" size={24} color={colors.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.methodLabel}>Cartão de crédito ou débito</Text>
          <Text style={styles.methodSub}>Visa, Mastercard, Elo e outros</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text3} />
      </TouchableOpacity>

      {isAnnual && (
        <TouchableOpacity
          style={styles.methodCard}
          onPress={() => navigation.navigate('Pix', { planId })}
          activeOpacity={0.85}
        >
          <View style={[styles.methodIcon, { backgroundColor: colors.greenBg }]}>
            <Ionicons name="qr-code-outline" size={24} color={colors.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.methodLabel}>PIX</Text>
            <Text style={styles.methodSub}>Pagamento instantâneo · apenas plano anual</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.text3} />
        </TouchableOpacity>
      )}

      <View style={styles.securityRow}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.text3} />
        <Text style={styles.securityText}>
          Pagamento processado com segurança pelo Pagar.me. Seus dados não são armazenados em nossos servidores.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  header: { marginBottom: 28 },
  title: { fontFamily: 'SpaceGrotesk', fontSize: 22, fontWeight: '700', color: colors.text },
  sub: { ...typography.label, color: colors.text2, marginTop: 6 },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 16, marginBottom: 12,
  },
  methodIcon: {
    width: 48, height: 48, borderRadius: radius.md,
    backgroundColor: colors.blueBg, alignItems: 'center', justifyContent: 'center',
  },
  methodLabel: { fontFamily: 'SpaceGrotesk', fontSize: 15, fontWeight: '600', color: colors.text },
  methodSub: { ...typography.small, color: colors.text2, marginTop: 2 },
  securityRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: 24, paddingTop: 24,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  securityText: { ...typography.small, color: colors.text3, flex: 1, lineHeight: 17 },
});
