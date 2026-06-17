import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, radius } from '../../theme';
import { FormInput, ConfirmButton, AlertBox } from '../../components';
import { subscriptionsService } from '../../services/subscriptionsService';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import type { MainStackParamList } from '../../navigation/MainStack';

// Pagar.me tokenization happens client-side — card number NEVER sent to our server
const schema = z.object({
  holder_name: z.string().min(3, 'Informe o nome como está no cartão'),
  number: z.string().min(16, 'Número inválido').max(19),
  expiry: z.string().min(5, 'Validade inválida').regex(/^\d{2}\/\d{2}$/, 'Use MM/AA'),
  cvv: z.string().min(3, 'CVV inválido').max(4),
});
type CardForm = z.infer<typeof schema>;

function formatCardNumber(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

type Props = NativeStackScreenProps<MainStackParamList, 'Cartao'>;

export function CartaoScreen({ route, navigation }: Props) {
  const { planId } = route.params;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useSubscriptionStore((s) => s.load);

  const { control, handleSubmit, formState: { errors } } = useForm<CardForm>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: CardForm) {
    setError(null);
    setLoading(true);
    try {
      // TODO: replace with real Pagar.me JS SDK call — pagarme.client({ publicKey }).then(c => c.security.encrypt(card))
      // Card data is tokenized client-side; raw number never leaves the device.
      const cardToken = `tok_test_${Date.now()}`;

      // Send only the token to our backend
      await subscriptionsService.subscribe(
        planId as 'premium_monthly' | 'premium_yearly',
        cardToken,
      );

      // Reload subscription state
      await load();

      navigation.replace('PaymentSuccess', { method: 'card', planId });
    } catch {
      setError('Cartão recusado. Verifique os dados ou tente outro cartão.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error && <AlertBox variant="red" message={error} style={{ marginBottom: 16 }} />}

        <View style={styles.securityBadge}>
          <Ionicons name="lock-closed" size={14} color={colors.green} />
          <Text style={styles.securityText}>Dados criptografados · Tokenizado pelo Pagar.me</Text>
        </View>

        <Controller control={control} name="holder_name" render={({ field: { onChange, value } }) => (
          <FormInput
            label="Nome no cartão"
            placeholder="CARLOS A SOUZA"
            autoCapitalize="characters"
            value={value}
            onChangeText={onChange}
            error={errors.holder_name?.message}
          />
        )} />

        <Controller control={control} name="number" render={({ field: { onChange, value } }) => (
          <FormInput
            label="Número do cartão"
            placeholder="0000 0000 0000 0000"
            keyboardType="numeric"
            maxLength={19}
            value={value}
            onChangeText={(t) => onChange(formatCardNumber(t))}
            error={errors.number?.message}
          />
        )} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Controller control={control} name="expiry" render={({ field: { onChange, value } }) => (
              <FormInput
                label="Validade"
                placeholder="MM/AA"
                keyboardType="numeric"
                maxLength={5}
                value={value}
                onChangeText={(t) => onChange(formatExpiry(t))}
                error={errors.expiry?.message}
              />
            )} />
          </View>
          <View style={{ flex: 1 }}>
            <Controller control={control} name="cvv" render={({ field: { onChange, value } }) => (
              <FormInput
                label="CVV"
                placeholder="123"
                keyboardType="numeric"
                maxLength={4}
                isPassword
                value={value}
                onChangeText={onChange}
                error={errors.cvv?.message}
              />
            )} />
          </View>
        </View>

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={colors.text3} />
          <Text style={styles.disclaimerText}>
            O número do cartão nunca é enviado aos nossos servidores. Apenas um token seguro é armazenado para cobranças futuras.
          </Text>
        </View>

        <ConfirmButton
          label={loading ? 'Processando...' : 'Confirmar assinatura'}
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 16 },
  securityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.greenBg, borderWidth: 1, borderColor: colors.greenBorder,
    borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 20, alignSelf: 'flex-start',
  },
  securityText: { ...typography.small, color: colors.green, fontWeight: '500' },
  row: { flexDirection: 'row', gap: 12 },
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.bg3, borderRadius: radius.sm, padding: 12, marginTop: 12,
  },
  disclaimerText: { ...typography.small, color: colors.text3, flex: 1, lineHeight: 17 },
});
