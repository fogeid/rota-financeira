import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { colors, spacing, typography } from '../../theme';
import {
  HeroCard, MetricCard, MetricGrid, Card, ListItem, Badge,
  SkeletonHeroCard, SkeletonMetricGrid, SkeletonListItem,
  FormInput, Chip, ConfirmButton, AlertBox,
} from '../../components';
import { useEarningsStore } from '../../store/earningsStore';
import { formatCurrency } from '../../utils/formatters';
import type { EarningItem } from '../../types/api';

type Period = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoje',
  week: 'Semana',
  month: 'Mês',
};

const PLATFORM_LABEL: Record<string, string> = {
  UBER: 'Uber',
  NOVENTA_E_NOVE: '99',
  IFOOD: 'iFood',
};

const PLATFORM_COLOR: Record<string, string> = {
  UBER: '#000000',
  NOVENTA_E_NOVE: '#FFDD00',
  IFOOD: '#EA1D2C',
};

const tripSchema = z.object({
  platform: z.string().min(1, 'Selecione a plataforma'),
  amount: z.string().min(1, 'Informe o valor').refine((v) => parseFloat(v.replace(',', '.')) > 0, 'Valor inválido'),
  km_driven: z.string().optional(),
});
type TripForm = z.infer<typeof tripSchema>;

const PLATFORMS = ['UBER', 'NOVENTA_E_NOVE', 'IFOOD'] as const;

function EarningListItem({ item, isLast }: { item: EarningItem; isLast: boolean }) {
  const time = new Date(item.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return (
    <ListItem
      icon={
        <View style={[styles.platformDot, { backgroundColor: colors.greenBg }]}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.green }}>
            {(PLATFORM_LABEL[item.platform] ?? item.platform).slice(0, 2)}
          </Text>
        </View>
      }
      name={`${PLATFORM_LABEL[item.platform] ?? item.platform} · ${time}`}
      sub={`${item.km_driven.toFixed(1)} km · ${item.origin === 'MANUAL' ? 'Manual' : 'Sync'}`}
      value={formatCurrency(item.amount)}
      valueColor={colors.green}
      isLast={isLast}
    />
  );
}

function EmptyState({ onRegister }: { onRegister: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="cash-outline" size={40} color={colors.text3} />
      <Text style={styles.emptyTitle}>Nenhuma corrida hoje</Text>
      <Text style={styles.emptySub}>Registre manualmente ou aguarde o sync automático</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onRegister}>
        <Text style={styles.emptyBtnText}>Registrar manualmente</Text>
      </TouchableOpacity>
    </View>
  );
}

export function GanhosScreen() {
  const { items, summary, period, isLoading, error, load, setPeriod, addEarning } = useEarningsStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('UBER');

  const { control, handleSubmit, reset, formState: { errors } } = useForm<TripForm>({
    resolver: zodResolver(tripSchema),
    defaultValues: { platform: 'UBER', amount: '', km_driven: '' },
  });

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(data: TripForm) {
    const now = new Date().toISOString();
    await addEarning({
      platform: selectedPlatform,
      amount: parseFloat(data.amount.replace(',', '.')),
      km_driven: parseFloat((data.km_driven ?? '0').replace(',', '.')) || 0,
      started_at: now,
      earned_at: now.slice(0, 10),
    });
    reset();
    setModalVisible(false);
  }

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {error ? <AlertBox variant="red" message={error} style={{ marginBottom: spacing.md }} /> : null}

        {isLoading || !summary ? (
          <SkeletonHeroCard />
        ) : (
          <HeroCard
            label="Total bruto hoje"
            value={formatCurrency(summary.gross_total)}
            sub={`${summary.trips_count} corridas · ${summary.days_worked} dia(s) trabalhado(s)`}
            variant="positive"
          />
        )}

        {isLoading || !summary ? (
          <SkeletonMetricGrid />
        ) : (
          <MetricGrid>
            <MetricCard
              label="Semana"
              value={formatCurrency(summary.gross_total * 5)}
              sub="Total estimado"
            />
            <MetricCard label="Mês" value="R$ 4.218,50" sub="Acumulado" />
            <MetricCard
              label="Melhor horário"
              value={summary.best_hour ? `${summary.best_hour}–${String(parseInt(summary.best_hour) + 1).padStart(2, '0')}h` : '—'}
              sub="Últimos 30 dias"
            />
            <MetricCard label="Corridas hoje" value={String(summary.trips_count)} sub="Total" />
          </MetricGrid>
        )}

        {/* Period filter tabs */}
        <View style={styles.tabs}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.tab, period === p && styles.tabActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.tabText, period === p && styles.tabTextActive]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* By platform */}
        {summary && (
          <>
            <Text style={styles.sectionLabel}>Por plataforma</Text>
            <Card>
              {Object.entries(summary.by_platform).map(([platform, total], i, arr) => (
                <ListItem
                  key={platform}
                  icon={
                    <View style={[styles.platformDot, { backgroundColor: colors.greenBg }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.green }}>
                        {(PLATFORM_LABEL[platform] ?? platform).slice(0, 2)}
                      </Text>
                    </View>
                  }
                  name={PLATFORM_LABEL[platform] ?? platform}
                  value={formatCurrency(total ?? 0)}
                  valueColor={colors.green}
                  isLast={i === arr.length - 1}
                />
              ))}
            </Card>
          </>
        )}

        {/* Rides list */}
        <Text style={styles.sectionLabel}>Últimas corridas</Text>
        <Card>
          {isLoading ? (
            <SkeletonListItem count={3} />
          ) : items.length === 0 ? (
            <EmptyState onRegister={() => setModalVisible(true)} />
          ) : (
            items.slice(0, 8).map((item, i) => (
              <EarningListItem key={item.id} item={item} isLast={i === Math.min(items.length, 8) - 1} />
            ))
          )}
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={26} color={colors.bg} />
      </TouchableOpacity>

      {/* Modal de registro manual */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Registrar corrida</Text>

              <Text style={styles.fieldLabel}>Plataforma</Text>
              <View style={styles.chipRow}>
                {PLATFORMS.map((p) => (
                  <Chip
                    key={p}
                    label={PLATFORM_LABEL[p]}
                    active={selectedPlatform === p}
                    onPress={() => setSelectedPlatform(p)}
                  />
                ))}
              </View>

              <Controller
                control={control}
                name="amount"
                render={({ field: { onChange, value } }) => (
                  <FormInput
                    label="Valor (R$)"
                    placeholder="0,00"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    error={errors.amount?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="km_driven"
                render={({ field: { onChange, value } }) => (
                  <FormInput
                    label="Km rodados (opcional)"
                    placeholder="0,0"
                    keyboardType="numeric"
                    value={value ?? ''}
                    onChangeText={onChange}
                  />
                )}
              />

              <ConfirmButton label="Salvar corrida" onPress={handleSubmit(onSubmit)} style={{ marginTop: 8 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: 16 },
  sectionLabel: {
    ...typography.micro,
    color: colors.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 20,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: colors.bg3,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.greenBg,
    borderColor: colors.greenBorder,
  },
  tabText: { ...typography.label, color: colors.text2 },
  tabTextActive: { color: colors.green, fontWeight: '600' },
  platformDot: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 96,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyTitle: { ...typography.h3, color: colors.text },
  emptySub: { ...typography.label, color: colors.text2, textAlign: 'center' },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: colors.green,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 99,
  },
  emptyBtnText: { ...typography.label, color: colors.bg, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: colors.bg2,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: colors.border2,
    padding: 22,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36, height: 4, backgroundColor: colors.border2,
    borderRadius: 99, alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'SpaceGrotesk', fontSize: 18, fontWeight: '700',
    color: colors.text, marginBottom: 20,
  },
  fieldLabel: { ...typography.micro, color: colors.text3, textTransform: 'uppercase', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
});
