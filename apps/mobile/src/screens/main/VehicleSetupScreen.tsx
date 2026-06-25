import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/MainStack';
import { vehiclesService } from '../../services/vehiclesService';
import { financingService } from '../../services/financingService';
import { FormInput, ConfirmButton, AlertBox } from '../../components';
import { colors, spacing, typography } from '../../theme';

const CURRENT_YEAR = new Date().getFullYear();

const schema = z.object({
  model: z.string().min(2, 'Informe a marca e modelo'),
  year: z
    .string()
    .regex(/^\d{4}$/, 'Ano inválido')
    .refine(
      (y) => Number(y) >= 1990 && Number(y) <= CURRENT_YEAR + 1,
      `Ano entre 1990 e ${CURRENT_YEAR + 1}`,
    ),
  plate: z.string().min(7, 'Placa inválida').max(8),
  fuel_efficiency: z
    .string()
    .regex(/^\d+([.,]\d{1,2})?$/, 'Informe um valor válido (ex: 12,5)')
    .refine((v) => parseFloat(v.replace(',', '.')) > 0, 'Deve ser maior que zero'),
  monthly_installment: z.string().min(1, 'Informe o valor da parcela'),
  due_day: z
    .string()
    .regex(/^\d+$/, 'Dia inválido')
    .refine((v) => Number(v) >= 1 && Number(v) <= 28, 'Dia entre 1 e 28'),
  desired_income: z.string().min(1, 'Informe a renda desejada'),
  work_days_per_month: z
    .string()
    .regex(/^\d+$/, 'Número inválido')
    .refine((v) => Number(v) >= 1 && Number(v) <= 30, 'Entre 1 e 30 dias'),
});

type FormData = z.infer<typeof schema>;

function parseBRL(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
}

export function VehicleSetupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setApiError(null);
    setLoading(true);
    try {
      await vehiclesService.upsertVehicle({
        model: data.model,
        year: Number(data.year),
        plate: data.plate.toUpperCase(),
        fuel_efficiency: parseFloat(data.fuel_efficiency.replace(',', '.')),
      });
      await financingService.update({
        monthly_installment: parseBRL(data.monthly_installment),
        due_day: Number(data.due_day),
        desired_income: parseBRL(data.desired_income),
        work_days_per_month: Number(data.work_days_per_month),
      });
      navigation.goBack();
    } catch {
      setApiError('Erro ao salvar. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {apiError ? <AlertBox variant="red" message={apiError} style={styles.alert} /> : null}

        <Text style={styles.section}>Veículo</Text>

        <Controller
          control={control}
          name="model"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Marca e modelo"
              placeholder="Ex: Toyota Corolla"
              autoCapitalize="words"
              value={value}
              onChangeText={onChange}
              error={errors.model?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="year"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Ano"
              placeholder={String(CURRENT_YEAR)}
              keyboardType="numeric"
              maxLength={4}
              value={value}
              onChangeText={onChange}
              error={errors.year?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="plate"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Placa"
              placeholder="ABC-1234 ou ABC1D23"
              autoCapitalize="characters"
              maxLength={8}
              value={value}
              onChangeText={onChange}
              error={errors.plate?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="fuel_efficiency"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Consumo médio (km/L)"
              placeholder="Ex: 12,5"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
              hint="Quantos km o carro faz por litro"
              error={errors.fuel_efficiency?.message}
            />
          )}
        />

        <View style={styles.divider} />
        <Text style={styles.section}>Financiamento</Text>

        <Controller
          control={control}
          name="monthly_installment"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Valor da parcela (R$)"
              placeholder="1.200,00"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
              hint="Valor mensal do financiamento"
              error={errors.monthly_installment?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="due_day"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Dia do vencimento"
              placeholder="25"
              keyboardType="numeric"
              maxLength={2}
              value={value}
              onChangeText={onChange}
              hint="Dia do mês em que a parcela vence (1–28)"
              error={errors.due_day?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="desired_income"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Renda líquida desejada (R$)"
              placeholder="3.000,00"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
              hint="Quanto quer ganhar além da parcela, por mês"
              error={errors.desired_income?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="work_days_per_month"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Dias de trabalho por mês"
              placeholder="22"
              keyboardType="numeric"
              maxLength={2}
              value={value}
              onChangeText={onChange}
              hint="Quantos dias por mês você costuma trabalhar"
              error={errors.work_days_per_month?.message}
            />
          )}
        />

        <ConfirmButton
          label="Salvar"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.btn}
        />

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: 24 },
  section: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 13,
    fontWeight: '700',
    color: colors.green,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 24,
  },
  alert: { marginBottom: spacing.lg },
  btn: { marginTop: spacing.md },
});
