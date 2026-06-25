import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authService } from '../../services/authService';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useRegistrationStore } from '../../store/registrationStore';
import { ConfirmButton, AlertBox } from '../../components';
import { colors, spacing, typography } from '../../theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTP'>;

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export function OTPScreen({ navigation, route }: Props) {
  const { phone, purpose, name, cpf } = route.params;
  const [code, setCode] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { setTokens, setUser } = useAuthStore();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  function parseBRL(value: string): number {
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  }

  async function handleVerify() {
    if (code.length < OTP_LENGTH) return;
    setApiError(null);
    setLoading(true);
    try {
      const response = await authService.verifyOtp(phone, code, purpose);
      await setTokens(response.access_token, response.refresh_token);
      setUser(response.user);
      if (purpose === 'REGISTRATION') {
        const { vehicleData, financingData, reset } = useRegistrationStore.getState();
        if (vehicleData && financingData) {
          await api.post('/vehicles', {
            model: `${vehicleData.brand} ${vehicleData.model}`.trim(),
            year: vehicleData.year,
            plate: vehicleData.plate,
            fuel_efficiency: vehicleData.fuel_efficiency,
          });
          await api.post('/financing/me', {
            monthly_installment: parseBRL(financingData.monthly_installment),
            due_day: Number(financingData.due_day),
            desired_income: parseBRL(financingData.desired_income),
            work_days_per_month: Number(financingData.work_days_per_month),
          });
        }
        reset();
        navigation.navigate('ConnectPlatform');
      } else {
        navigation.navigate('ResetPassword', { phone, code });
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 429) {
        setApiError('Muitas tentativas. Aguarde e tente novamente.');
      } else {
        setApiError('Código inválido ou expirado.');
      }
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0) return;
    setResending(true);
    try {
      await authService.resendOtp(phone, purpose);
      setCountdown(RESEND_COOLDOWN);
      setApiError(null);
    } catch {
      setApiError('Não foi possível reenviar. Tente novamente.');
    } finally {
      setResending(false);
    }
  }

  function handleChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(digits);
    if (digits.length === OTP_LENGTH) {
      // Auto-submit when all digits entered
      setTimeout(() => handleVerify(), 100);
    }
  }

  const maskedPhone = phone.replace(/(\+55)(\d{2})(\d{5})(\d{4})/, '+55 ($2) $3-$4');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verificação</Text>
      <Text style={styles.sub}>
        Enviamos um código para{'\n'}
        <Text style={styles.phone}>{maskedPhone}</Text>
      </Text>

      {apiError ? <AlertBox variant="red" message={apiError} style={styles.alert} /> : null}

      {/* Hidden real input */}
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        style={styles.hiddenInput}
        autoFocus
      />

      {/* Visual digit boxes */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
        style={styles.digitRow}
      >
        {Array.from({ length: OTP_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.digitBox,
              code.length === i && styles.digitBoxActive,
              code[i] ? styles.digitBoxFilled : null,
            ]}
          >
            <Text style={styles.digitText}>{code[i] ?? ''}</Text>
          </View>
        ))}
      </TouchableOpacity>

      <ConfirmButton
        label="Verificar"
        onPress={handleVerify}
        loading={loading}
        disabled={code.length < OTP_LENGTH}
        style={styles.btn}
      />

      <TouchableOpacity
        onPress={handleResend}
        disabled={countdown > 0 || resending}
        style={styles.resendBtn}
      >
        <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
          {countdown > 0
            ? `Reenviar em ${countdown}s`
            : 'Reenviar código'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xl,
    paddingTop: 60,
  },
  title: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  sub: {
    ...typography.body,
    color: colors.text2,
    marginBottom: 36,
    lineHeight: 22,
  },
  phone: {
    color: colors.text,
    fontWeight: '600',
  },
  alert: { marginBottom: spacing.lg },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  digitRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 36,
  },
  digitBox: {
    width: 48,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxActive: {
    borderColor: colors.green,
  },
  digitBoxFilled: {
    borderColor: colors.border2,
  },
  digitText: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  btn: {},
  resendBtn: {
    alignItems: 'center',
    marginTop: spacing.xl,
    padding: spacing.sm,
  },
  resendText: {
    ...typography.label,
    color: colors.green,
  },
  resendDisabled: {
    color: colors.text3,
  },
});
