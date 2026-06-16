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
import { FormInput, ConfirmButton, AlertBox } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { formatCpfInput, stripCpfMask, formatPhoneInput, stripPhoneMask } from '../../utils/formatters';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

const schema = z.object({
  name: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  cpf: z.string().min(14, 'CPF inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
});

type FormData = z.infer<typeof schema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterStep1'>;

export function RegisterStep1Screen({ navigation }: Props) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setApiError(null);
    setLoading(true);
    try {
      const phone = stripPhoneMask(data.phone);
      // Store partial data and move to OTP
      await authService.register({
        name: data.name,
        cpf: stripCpfMask(data.cpf),
        phone,
        email: '', // filled in step 2
        password: '', // filled in step 2
      });
      navigation.navigate('OTP', {
        phone,
        purpose: 'REGISTRATION',
        name: data.name,
        cpf: stripCpfMask(data.cpf),
      });
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
        <Text style={styles.step}>Passo 1 de 4</Text>
        <Text style={styles.title}>Seus dados</Text>
        <Text style={styles.sub}>Vamos começar com suas informações básicas.</Text>

        {apiError ? <AlertBox variant="red" message={apiError} style={styles.alert} /> : null}

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Nome completo"
              placeholder="Carlos Souza"
              autoCapitalize="words"
              value={value}
              onChangeText={onChange}
              error={errors.name?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="cpf"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="CPF"
              placeholder="000.000.000-00"
              keyboardType="numeric"
              maxLength={14}
              value={value}
              onChangeText={(t) => onChange(formatCpfInput(t))}
              error={errors.cpf?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Telefone (WhatsApp)"
              placeholder="(11) 99999-8888"
              keyboardType="phone-pad"
              maxLength={16}
              value={value}
              onChangeText={(t) => onChange(t.replace(/\D/g, '').replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3'))}
              hint="Usaremos para verificação via SMS"
              error={errors.phone?.message}
            />
          )}
        />

        <ConfirmButton
          label="Continuar"
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
