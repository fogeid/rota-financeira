import React, { useState, useRef, useEffect } from 'react';
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
import { referralService } from '../../services/referralService';
import { useRegistrationStore } from '../../store/registrationStore';
import { FormInput, ConfirmButton } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { formatCpfInput, stripCpfMask, stripPhoneMask } from '../../utils/formatters';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { registerStep1Schema } from '../../schemas/registerSchemas';

const schema = registerStep1Schema;

type FormData = z.infer<typeof schema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterStep1'>;

export function RegisterStep1Screen({ navigation }: Props) {
  const [referralCode, setReferralCode] = useState('');
  const [referralStatus, setReferralStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const referralTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setReferralCodeInStore = useRegistrationStore((s) => s.setReferralCode);

  useEffect(() => {
    const code = referralCode.trim().toUpperCase();
    if (referralTimer.current) clearTimeout(referralTimer.current);
    if (!code || code.length < 8) {
      setReferralStatus('idle');
      setReferrerName(null);
      return;
    }
    referralTimer.current = setTimeout(async () => {
      try {
        const res = await referralService.validateCode(code);
        if (res.valid) {
          setReferralStatus('valid');
          setReferrerName(res.referrer_name ?? null);
        } else {
          setReferralStatus('invalid');
          setReferrerName(null);
        }
      } catch {
        setReferralStatus('idle');
      }
    }, 600);
    return () => { if (referralTimer.current) clearTimeout(referralTimer.current); };
  }, [referralCode]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function onSubmit(data: FormData) {
    const code = referralCode.trim().toUpperCase();
    setReferralCodeInStore(code.length >= 6 ? code : null);
    navigation.navigate('RegisterStep2', {
      phone: stripPhoneMask(data.phone),
      name: data.name,
      cpf: stripCpfMask(data.cpf),
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
        <Text style={styles.step}>Passo 1 de 4</Text>
        <Text style={styles.title}>Seus dados</Text>
        <Text style={styles.sub}>Vamos começar com suas informações básicas.</Text>

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

        <FormInput
          label="Código de indicação (opcional)"
          placeholder="Tem um código? Digite aqui (opcional)"
          autoCapitalize="characters"
          maxLength={8}
          value={referralCode}
          onChangeText={(t) => setReferralCode(t.toUpperCase())}
        />
        {referralStatus === 'valid' && referrerName && (
          <Text style={styles.referralValid}>
            Código válido! Indicação de {referrerName}. Você ganhará 7 dias de Premium.
          </Text>
        )}
        {referralStatus === 'invalid' && (
          <Text style={styles.referralInvalid}>Código inválido. Verifique e tente novamente.</Text>
        )}

        <ConfirmButton
          label="Continuar"
          onPress={handleSubmit(onSubmit)}
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
  btn: { marginTop: spacing.md },
  referralValid: { ...typography.small, color: colors.green, marginTop: 4, marginBottom: 4 },
  referralInvalid: { ...typography.small, color: colors.red, marginTop: 4, marginBottom: 4 },
});
