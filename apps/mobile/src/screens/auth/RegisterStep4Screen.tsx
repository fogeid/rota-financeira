import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authService } from '../../services/authService';
import { useRegistrationStore } from '../../store/registrationStore';
import { FormInput, ConfirmButton, AlertBox } from '../../components';
import { colors, spacing, typography } from '../../theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

const schema = z.object({
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
type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterStep4'>;

function parseBRL(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
}

export function RegisterStep4Screen({ navigation, route }: Props) {
  const { phone, name, cpf, email, password, plate, brand, model, year, fuel_efficiency } = route.params;
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { referralCode, setVehicleData, setFinancingData } = useRegistrationStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setApiError(null);
    setLoading(true);
    try {
      setVehicleData({ plate, brand, model, year, fuel_efficiency });
      setFinancingData(data);

      await authService.register({
        name,
        cpf,
        phone,
        email,
        password,
        ...(referralCode ? { referral_code: referralCode } : {}),
      });

      navigation.navigate('OTP', { phone, purpose: 'REGISTRATION' });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      if (status === 409) {
        setApiError('CPF, telefone ou e-mail já cadastrado.');
      } else if (status === 400) {
        setApiError(msg ?? 'Dados inválidos. Verifique os campos.');
      } else {
        setApiError('Erro de conexão. Tente novamente.');
      }
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
        <Text style={styles.step}>Passo 4 de 4</Text>
        <Text style={styles.title}>Financiamento</Text>
        <Text style={styles.sub}>
          Esses dados calculam quanto você precisa ganhar por dia.
        </Text>

        {apiError ? <AlertBox variant="red" message={apiError} style={styles.alert} /> : null}

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
              hint="Valor mensal do financiamento do veículo"
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
          label="Finalizar cadastro"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.btn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: 40, flexGrow: 1 },
  step: { ...typography.micro, color: colors.green, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  title: { fontFamily: 'SpaceGrotesk', fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 8 },
  sub: { ...typography.body, color: colors.text2, marginBottom: 32 },
  alert: { marginBottom: spacing.lg },
  btn: { marginTop: spacing.md },
});
