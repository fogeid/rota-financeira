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
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Precisa de letra maiúscula')
    .regex(/[0-9]/, 'Precisa de número')
    .regex(/[@$!%*?&]/, 'Precisa de caractere especial'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const { phone, code } = route.params;
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
      await authService.resetPassword(phone, code, data.password);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch {
      setApiError('Código expirado ou inválido. Solicite um novo.');
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
        <Text style={styles.title}>Nova senha</Text>
        <Text style={styles.sub}>Crie uma nova senha para sua conta.</Text>

        {apiError ? <AlertBox variant="red" message={apiError} style={styles.alert} /> : null}

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Nova senha"
              placeholder="Mínimo 8 caracteres"
              isPassword
              value={value}
              onChangeText={onChange}
              error={errors.password?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Confirmar nova senha"
              placeholder="Repita a senha"
              isPassword
              value={value}
              onChangeText={onChange}
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <ConfirmButton
          label="Salvar nova senha"
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
  alert: { marginBottom: spacing.lg },
  btn: { marginTop: spacing.md },
});
