import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import * as LocalAuthentication from 'expo-local-authentication';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { FormInput, ConfirmButton, AlertBox } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { formatCpfInput, stripCpfMask } from '../../utils/formatters';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

const schema = z.object({
  cpf: z.string().min(14, 'CPF inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

type FormData = z.infer<typeof schema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setTokens, setUser, biometryEnabled } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (biometryEnabled) {
      handleBiometry();
    }
  }, [biometryEnabled]);

  async function handleBiometry() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Entrar no Motorista Rico',
      cancelLabel: 'Usar senha',
      disableDeviceFallback: false,
    });
    if (result.success) {
      // Tokens already stored in SecureStore — navigate to main app
      useAuthStore.getState().initialize();
    }
  }

  async function onSubmit(data: FormData) {
    setApiError(null);
    setLoading(true);
    try {
      const response = await authService.login({
        cpf: stripCpfMask(data.cpf),
        password: data.password,
      });
      await setTokens(response.access_token, response.refresh_token);
      setUser(response.user);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      if (status === 401) {
        setApiError('CPF ou senha incorretos');
      } else if (status === 423) {
        setApiError('Conta temporariamente bloqueada. Tente novamente em alguns minutos.');
      } else {
        setApiError(msg ?? 'Erro ao conectar. Verifique sua conexão.');
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
        <View style={styles.header}>
          <Text style={styles.logo}>Rota <Text style={styles.logoAccent}>Financeira</Text></Text>
          <Text style={styles.subtitle}>O copiloto das suas finanças</Text>
        </View>

        {apiError ? (
          <AlertBox variant="red" message={apiError} style={styles.alert} />
        ) : null}

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
              onChangeText={(text) => onChange(formatCpfInput(text))}
              error={errors.cpf?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Senha"
              placeholder="Sua senha"
              isPassword
              value={value}
              onChangeText={onChange}
              error={errors.password?.message}
            />
          )}
        />

        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgotBtn}
        >
          <Text style={styles.forgotText}>Esqueci minha senha</Text>
        </TouchableOpacity>

        <ConfirmButton
          label="Entrar"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.loginBtn}
        />

        {biometryEnabled ? (
          <TouchableOpacity style={styles.biometryBtn} onPress={handleBiometry}>
            <Ionicons name="finger-print-outline" size={28} color={colors.green} />
            <Text style={styles.biometryText}>Entrar com biometria</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Ainda não tem conta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('RegisterStep1')}>
            <Text style={styles.registerLink}>Cadastrar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: 60, flexGrow: 1 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  logoAccent: { color: colors.green },
  subtitle: {
    ...typography.body,
    color: colors.text2,
    marginTop: 8,
  },
  alert: { marginBottom: spacing.lg },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: spacing.xl, marginTop: -spacing.sm },
  forgotText: { ...typography.label, color: colors.green },
  loginBtn: { marginTop: spacing.sm },
  biometryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: 10,
  },
  biometryText: { ...typography.label, color: colors.green },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  registerText: { ...typography.body, color: colors.text2 },
  registerLink: { ...typography.body, color: colors.green, fontWeight: '600' },
});
