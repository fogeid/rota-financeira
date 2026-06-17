import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { colors, spacing, typography, radius } from '../../theme';
import {
  HeroCard, MetricCard, MetricGrid, AlertBox, WeekBarChart, Card,
  ListItem, Badge, SkeletonHeroCard, SkeletonMetricGrid,
  FormInput, Chip, ConfirmButton,
} from '../../components';
import { useHomeStore } from '../../store/homeStore';
import { useEarningsStore } from '../../store/earningsStore';
import { useCostsStore } from '../../store/costsStore';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/formatters';
import type { IntegrationStatus, CostType } from '../../types/api';

const PLATFORM_LABEL: Record<string, string> = {
  UBER: 'Uber', NOVENTA_E_NOVE: '99', IFOOD: 'iFood',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatDate(): string {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function syncLabel(s: IntegrationStatus): string {
  if (!s.last_sync_at) return 'Nunca sincronizado';
  const diff = Date.now() - new Date(s.last_sync_at).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Sync há menos de 1h';
  return `Sync há ${h}h`;
}

// ─── Register Earning Modal ────────────────────────────────────────────────

const EARNING_PLATFORMS = ['UBER', 'NOVENTA_E_NOVE', 'IFOOD'] as const;

const tripSchema = z.object({
  amount: z.string().min(1, 'Informe o valor').refine((v) => parseFloat(v.replace(',', '.')) > 0, 'Valor inválido'),
  km_driven: z.string().optional(),
});
type TripForm = z.infer<typeof tripSchema>;

function RegisterEarningModal({ visible, onClose, onSuccess }: {
  visible: boolean; onClose: () => void; onSuccess: (amount: number) => void;
}) {
  const addEarning = useEarningsStore((s) => s.addEarning);
  const [platform, setPlatform] = useState('UBER');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<TripForm>({
    resolver: zodResolver(tripSchema),
    defaultValues: { amount: '', km_driven: '' },
  });

  function handleClose() { reset(); setApiError(null); onClose(); }

  async function onSubmit(data: TripForm) {
    setSubmitting(true);
    setApiError(null);
    const now = new Date().toISOString();
    const amount = parseFloat(data.amount.replace(',', '.'));
    try {
      await addEarning({
        platform,
        amount,
        km_driven: parseFloat((data.km_driven ?? '0').replace(',', '.')) || 0,
        started_at: now,
        earned_at: now.slice(0, 10),
      });
      reset();
      onSuccess(amount);
    } catch {
      setApiError('Erro ao registrar corrida. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <View style={mStyles.header}>
              <Text style={mStyles.title}>Registrar corrida</Text>
              <TouchableOpacity onPress={handleClose}><Ionicons name="close" size={22} color={colors.text2} /></TouchableOpacity>
            </View>

            {apiError && <AlertBox variant="red" message={apiError} style={{ marginBottom: 8 }} />}

            <Text style={mStyles.label}>Plataforma</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              {EARNING_PLATFORMS.map((p) => (
                <Chip key={p} label={PLATFORM_LABEL[p]} active={platform === p} onPress={() => setPlatform(p)} />
              ))}
            </View>

            <Controller control={control} name="amount" render={({ field: { onChange, value } }) => (
              <FormInput
                label="Valor recebido (R$)"
                placeholder="45,00"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
                error={errors.amount?.message}
              />
            )} />

            <Controller control={control} name="km_driven" render={({ field: { onChange, value } }) => (
              <FormInput
                label="Km rodados (opcional)"
                placeholder="10,5"
                keyboardType="decimal-pad"
                value={value ?? ''}
                onChangeText={onChange}
              />
            )} />

            <ConfirmButton
              label={submitting ? 'Salvando...' : 'Registrar corrida'}
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Register Cost Modal ───────────────────────────────────────────────────

const COST_TYPES: { type: CostType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { type: 'FUEL', label: 'Abastecimento', icon: 'car-outline' },
  { type: 'MAINTENANCE', label: 'Manutenção', icon: 'build-outline' },
  { type: 'CAR_WASH', label: 'Lavagem', icon: 'water-outline' },
  { type: 'OTHER', label: 'Outro', icon: 'ellipsis-horizontal-outline' },
];

const costSchema = z.object({
  amount: z.string().min(1, 'Informe o valor').refine((v) => parseFloat(v.replace(',', '.')) > 0, 'Valor inválido'),
  description: z.string().optional(),
});
type CostForm = z.infer<typeof costSchema>;

function RegisterCostModal({ visible, onClose, onSuccess }: {
  visible: boolean; onClose: () => void; onSuccess: (amount: number) => void;
}) {
  const addCost = useCostsStore((s) => s.addCost);
  const [costType, setCostType] = useState<CostType>('FUEL');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CostForm>({
    resolver: zodResolver(costSchema),
    defaultValues: { amount: '', description: '' },
  });

  function handleClose() { reset(); setApiError(null); onClose(); }

  async function onSubmit(data: CostForm) {
    setSubmitting(true);
    setApiError(null);
    const amount = parseFloat(data.amount.replace(',', '.'));
    try {
      await addCost({
        type: costType,
        amount,
        description: data.description?.trim() || undefined,
        cost_date: new Date().toISOString().slice(0, 10),
      });
      reset();
      onSuccess(amount);
    } catch {
      setApiError('Erro ao registrar gasto. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <View style={mStyles.header}>
              <Text style={mStyles.title}>Registrar gasto</Text>
              <TouchableOpacity onPress={handleClose}><Ionicons name="close" size={22} color={colors.text2} /></TouchableOpacity>
            </View>

            {apiError && <AlertBox variant="red" message={apiError} style={{ marginBottom: 8 }} />}

            <Text style={mStyles.label}>Tipo de gasto</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
              {COST_TYPES.map(({ type, label }) => (
                <Chip key={type} label={label} active={costType === type} onPress={() => setCostType(type)} />
              ))}
            </View>

            <Controller control={control} name="amount" render={({ field: { onChange, value } }) => (
              <FormInput
                label="Valor (R$)"
                placeholder="150,00"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
                error={errors.amount?.message}
              />
            )} />

            <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
              <FormInput
                label="Descrição (opcional)"
                placeholder="Ex: Troca de óleo"
                value={value ?? ''}
                onChangeText={onChange}
              />
            )} />

            <ConfirmButton
              label={submitting ? 'Salvando...' : 'Registrar gasto'}
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────

export function HomeScreen() {
  const { data, isLoading, error, load } = useHomeStore();
  const user = useAuthStore((s) => s.user);
  const [earningModalVisible, setEarningModalVisible] = useState(false);
  const [costModalVisible, setCostModalVisible] = useState(false);

  useEffect(() => {
    load();
  }, []);

  function handleEarningSuccess(amount: number) {
    setEarningModalVisible(false);
    load();
    const fmt = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    Alert.alert('Corrida registrada!', `R$ ${fmt} adicionados ao seu dia.`);
  }

  function handleCostSuccess(amount: number) {
    setCostModalVisible(false);
    load();
    const fmt = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    Alert.alert('Gasto registrado!', `R$ ${fmt} debitados.`);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {greeting()}, {user?.name?.split(' ')[0] ?? 'motorista'} 👋
            </Text>
            <Text style={styles.date}>{formatDate()}</Text>
          </View>
        </View>

        {/* Error */}
        {error ? <AlertBox variant="red" message={error} style={{ marginBottom: spacing.md }} /> : null}

        {/* HeroCard */}
        {isLoading || !data ? (
          <SkeletonHeroCard />
        ) : (
          <HeroCard
            label="Lucro líquido hoje"
            value={formatCurrency(data.daily_net)}
            sub={`Meta: ${formatCurrency(data.daily_goal)} · ${data.goal_progress}% concluída`}
            variant={data.daily_net >= 0 ? 'positive' : 'negative'}
            progress={Math.min(data.goal_progress, 100)}
            progressLabel="Meta diária"
          />
        )}

        {/* QuickActions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => setEarningModalVisible(true)} activeOpacity={0.75}>
            <Ionicons name="add-circle-outline" size={18} color={colors.green} />
            <Text style={styles.quickBtnText}>Registrar corrida</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => setCostModalVisible(true)} activeOpacity={0.75}>
            <Ionicons name="receipt-outline" size={18} color={colors.green} />
            <Text style={styles.quickBtnText}>Registrar gasto</Text>
          </TouchableOpacity>
        </View>

        {/* MetricGrid */}
        {isLoading || !data ? (
          <SkeletonMetricGrid />
        ) : (
          <MetricGrid>
            <MetricCard label="Parcela" value={formatCurrency(data.installment)} sub={`Vence em ${data.days_until_due} dias`} />
            <MetricCard label="IR estimado" value={formatCurrency(data.estimated_tax)} sub="Este mês" />
            <MetricCard label="Semana" value={formatCurrency(data.week_earnings)} sub="+12% vs. semana passada" />
            <MetricCard label="Custo/km" value={`R$ ${data.cost_per_km.toFixed(2).replace('.', ',')}`} sub="Média mensal" />
          </MetricGrid>
        )}

        {/* Alerts */}
        {data?.alerts.map((a, i) => (
          <AlertBox key={i} variant={a.variant} message={a.message} />
        ))}

        {/* Semana */}
        <Text style={styles.sectionLabel}>Semana</Text>
        <Card>
          {data ? <WeekBarChart data={data.week_data} /> : <View style={{ height: 80 }} />}
        </Card>

        {/* Plataformas */}
        <Text style={styles.sectionLabel}>Plataformas</Text>
        <Card>
          {!data || data.integrations.length === 0 ? (
            <Text style={[typography.label, { color: colors.text2 }]}>
              Nenhuma plataforma conectada. Vá em Perfil para conectar.
            </Text>
          ) : (
            data.integrations.map((s, i) => (
              <ListItem
                key={s.platform}
                icon={
                  <View style={[styles.platformIcon, { backgroundColor: s.is_active ? colors.greenBg : colors.border }]}>
                    <Ionicons name="car-outline" size={16} color={s.is_active ? colors.green : colors.text3} />
                  </View>
                }
                name={PLATFORM_LABEL[s.platform] ?? s.platform}
                sub={syncLabel(s)}
                isLast={i === data.integrations.length - 1}
                right={
                  <Badge
                    variant={s.last_sync_status === 'SUCCESS' ? 'green' : s.last_sync_status === 'RUNNING' ? 'blue' : 'red'}
                    label={s.last_sync_status === 'SUCCESS' ? 'Ativo' : s.last_sync_status === 'RUNNING' ? 'Sync...' : 'Falhou'}
                  />
                }
              />
            ))
          )}
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>

      <RegisterEarningModal
        visible={earningModalVisible}
        onClose={() => setEarningModalVisible(false)}
        onSuccess={handleEarningSuccess}
      />
      <RegisterCostModal
        visible={costModalVisible}
        onClose={() => setCostModalVisible(false)}
        onSuccess={handleCostSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  greeting: { fontFamily: 'SpaceGrotesk', fontSize: 20, fontWeight: '700', color: colors.text },
  date: { ...typography.small, color: colors.text3, marginTop: 2 },
  sectionLabel: {
    ...typography.micro, color: colors.text3,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 10, marginTop: 20,
  },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 10, marginTop: 4 },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.greenBg, borderWidth: 1, borderColor: colors.greenBorder,
    borderRadius: 10, paddingVertical: 10,
  },
  quickBtnText: { ...typography.label, color: colors.green, fontWeight: '600' },
  platformIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, paddingTop: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontFamily: 'SpaceGrotesk', fontSize: 18, fontWeight: '700', color: colors.text },
  label: { ...typography.small, color: colors.text2, marginBottom: 6, marginTop: 12 },
});
