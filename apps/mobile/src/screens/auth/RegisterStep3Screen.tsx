import React from 'react';
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
import { FormInput, ConfirmButton } from '../../components';
import { colors, spacing, typography } from '../../theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

const CURRENT_YEAR = new Date().getFullYear();

const schema = z.object({
  plate: z.string().min(7, 'Placa inválida').max(8),
  brand: z.string().min(2, 'Informe a marca'),
  model: z.string().min(2, 'Informe o modelo'),
  year: z
    .string()
    .regex(/^\d{4}$/, 'Ano inválido')
    .refine((y) => Number(y) >= 1990 && Number(y) <= CURRENT_YEAR + 1, {
      message: `Ano entre 1990 e ${CURRENT_YEAR + 1}`,
    }),
  fuel_efficiency: z
    .string()
    .regex(/^\d+([.,]\d{1,2})?$/, 'Informe um valor válido (ex: 12,5)')
    .refine((v) => parseFloat(v.replace(',', '.')) > 0, 'Deve ser maior que zero'),
});

type FormData = z.infer<typeof schema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterStep3'>;

export function RegisterStep3Screen({ navigation, route }: Props) {
  const params = route.params;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function onSubmit(data: FormData) {
    navigation.navigate('RegisterStep4', {
      ...params,
      plate: data.plate.toUpperCase(),
      brand: data.brand,
      model: data.model,
      year: Number(data.year),
      fuel_efficiency: parseFloat(data.fuel_efficiency.replace(',', '.')),
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
        <Text style={styles.step}>Passo 3 de 4</Text>
        <Text style={styles.title}>Seu veículo</Text>
        <Text style={styles.sub}>
          Precisamos dos dados do carro para calcular sua meta diária.
        </Text>

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
          name="brand"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Marca"
              placeholder="Ex: Toyota"
              autoCapitalize="words"
              value={value}
              onChangeText={onChange}
              error={errors.brand?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="model"
          render={({ field: { onChange, value } }) => (
            <FormInput
              label="Modelo"
              placeholder="Ex: Corolla"
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
  btn: { marginTop: spacing.md },
});
