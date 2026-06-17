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
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

const schema = z.object({
  phone: z.string().min(10, 'Telefone inválido'),
});

type FormData = z.infer<typeof schema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setApiError(null);
    try {
      const phone = `+55${data.phone.replace(/\D/g, '')}`;
      await authService.forgotPassword(phone);
      setSent(true);
      navigation.navigate('OTP', { phone, purpose: 'PASSWORD_RESET' });
    } catch {
      setApiError('Número não encontrado ou erro ao enviar SMS. Verifique e tente novamente.');
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
        <Text style={styles.title}>Esqueci a senha</Text>
        <Text style={styles.sub}>
          Informe seu telefone cadastrado. Enviaremos um código de verificação.
        </Text>

        {sent ? (
          <AlertBox variant="green" message="Código enviado! Verifique seu telefone." />
        ) : null}
        {apiError ? (
          <AlertBox variant="red" message={apiError} style={{ marginBottom: 16 }} />
        ) : null}

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Telefone"
              placeholder="(11) 99999-8888"
              keyboardType="phone-pad"
              maxLength={15}
              value={value}
              onChangeText={(t) => onChange(t.replace(/\D/g, '').replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3'))}
              error={errors.phone?.message}
            />
          )}
        />

        <ConfirmButton
          label="Enviar código"
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
  content: { padding: spacing.xl, paddingTop: 60, flexGrow: 1 },
  title: { fontFamily: 'SpaceGrotesk', fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 8 },
  sub: { ...typography.body, color: colors.text2, marginBottom: 32 },
  btn: { marginTop: spacing.md },
});
