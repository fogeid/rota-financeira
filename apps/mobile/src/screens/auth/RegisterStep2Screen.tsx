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
import { FormInput, ConfirmButton, AlertBox } from '../../components';
import { colors, spacing, typography } from '../../theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Precisa de letra maiúscula')
    .regex(/[0-9]/, 'Precisa de número')
    .regex(/[@$!%*?&]/, 'Precisa de caractere especial (@$!%*?&)'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterStep2'>;

export function RegisterStep2Screen({ navigation, route }: Props) {
  const { phone, name, cpf } = route.params;
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function onSubmit(data: FormData) {
    navigation.navigate('RegisterStep3', {
      phone,
      name,
      cpf,
      email: data.email,
      password: data.password,
    });
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
        <Text style={styles.step}>Passo 2 de 4</Text>
        <Text style={styles.title}>Acesso</Text>
        <Text style={styles.sub}>Crie suas credenciais de acesso ao app.</Text>

        {apiError ? <AlertBox variant="red" message={apiError} style={styles.alert} /> : null}

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="E-mail"
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Senha"
              placeholder="Mínimo 8 caracteres"
              isPassword
              value={value}
              onChangeText={onChange}
              hint="Use letras maiúsculas, números e um caractere especial"
              error={errors.password?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Confirmar senha"
              placeholder="Repita a senha"
              isPassword
              value={value}
              onChangeText={onChange}
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <ConfirmButton label="Continuar" onPress={handleSubmit(onSubmit)} style={styles.btn} />
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
