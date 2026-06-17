import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import {
  MetricCard, MetricGrid, Card, AlertBox, WeekBarChart, ProgressBar,
  SkeletonHeroCard, SkeletonMetricGrid,
} from '../../components';
import { useFinancingStore } from '../../store/financingStore';
import { earningsService } from '../../services/earningsService';
import { formatCurrency } from '../../utils/formatters';
import type { EarningItem } from '../../types/api';

const DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

function buildWeekDays(goal: number, earnings: EarningItem[]) {
  const today = new Date();
  const todayDow = today.getDay();
  const dayTotals: Record<number, number> = {};

  for (const e of earnings) {
    const d = new Date(e.earned_at);
    const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diff >= 0 && diff < 7) {
      const dow = d.getDay();
      dayTotals[dow] = (dayTotals[dow] ?? 0) + e.amount;
    }
  }

  return DAYS.map((day, i) => ({
    day,
    value: i <= todayDow ? (dayTotals[i] ?? 0) : 0,
    goal,
  }));
}

const HEALTH_ALERT: Record<string, { variant: 'green' | 'amber' | 'red'; text: string }> = {
  GREEN: { variant: 'green', text: 'Distribuição saudável. Parcela representa menos de 40% da sua renda.' },
  AMBER: { variant: 'amber', text: 'No limite — fique atento. Parcela está entre 40% e 50% da sua renda.' },
  RED: { variant: 'red', text: 'Carro consome mais de 50% da sua renda. Considere renegociar as parcelas.' },
};

export function MeuCarroScreen() {
  const { data, progress, isLoading, error, load } = useFinancingStore();
  const [weekEarnings, setWeekEarnings] = useState<EarningItem[]>([]);

  useEffect(() => {
    load();
    const thisMonth = new Date().toISOString().slice(0, 7);
    earningsService.list({ month: thisMonth }).then((res) => setWeekEarnings(res.data)).catch(() => {});
  }, []);

  const progressColor =
    !progress ? colors.green
    : progress.percentage >= 100 ? colors.green
    : progress.percentage >= 60 ? colors.amber
    : colors.red;

  const pctInstallment = data && progress
    ? Math.round((data.monthly_installment / data.monthly_goal) * 100)
    : 40;
  const estimatedCosts = data
    ? data.monthly_goal - data.monthly_installment - data.desired_income
    : 1500;
  const pctCosts = data
    ? Math.round((estimatedCosts / data.monthly_goal) * 100)
    : 25;
  const pctIncome = 100 - pctInstallment - pctCosts;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {error ? <AlertBox variant="red" message={error} style={{ marginBottom: spacing.md }} /> : null}

      {/* Vehicle card */}
      <Card style={styles.vehicleCard}>
        <View style={styles.vehicleRow}>
          <View style={styles.vehicleIconWrap}>
            <Ionicons name="car" size={22} color={colors.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleModel}>Chevrolet Onix 2024</Text>
            <Text style={styles.vehiclePlate}>ABC-1D23</Text>
          </View>
          <View style={styles.vehicleBadge}>
            <Text style={styles.vehicleBadgeText}>Financiado</Text>
          </View>
        </View>
        {data && (
          <View style={styles.installmentRow}>
            <View>
              <Text style={styles.installmentLabel}>PARCELA MENSAL</Text>
              <Text style={styles.installmentValue}>{formatCurrency(data.monthly_installment)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.installmentLabel}>VENCIMENTO</Text>
              <Text style={styles.installmentValue}>Dia {data.due_day}</Text>
            </View>
          </View>
        )}
      </Card>

      {/* MetricGrid */}
      {isLoading || !data ? (
        <SkeletonMetricGrid />
      ) : (
        <MetricGrid>
          <MetricCard
            label="Meta diária"
            value={formatCurrency(data.calculated_daily_goal)}
            sub="Para cobrir tudo"
          />
          <MetricCard
            label="Só parcela"
            value={formatCurrency(data.monthly_installment / data.work_days_per_month)}
            sub={`${data.work_days_per_month} dias/mês`}
          />
          <MetricCard
            label="Só renda"
            value={formatCurrency(data.desired_income / data.work_days_per_month)}
            sub="Renda desejada/dia"
          />
          <MetricCard
            label="Total mensal"
            value={formatCurrency(data.monthly_goal)}
            sub="Meta do mês"
          />
        </MetricGrid>
      )}

      {/* Distribuição segmentada */}
      {data && (
        <>
          <Text style={styles.sectionLabel}>Distribuição a cada R$ 100</Text>
          <Card>
            <View style={styles.segmentedBar}>
              <View style={[styles.segment, { flex: pctInstallment, backgroundColor: colors.blue }]} />
              <View style={[styles.segment, { flex: pctCosts, backgroundColor: colors.amber }]} />
              <View style={[styles.segment, { flex: pctIncome, backgroundColor: colors.green }]} />
            </View>
            <View style={styles.legendRow}>
              <LegendItem color={colors.blue} label="Parcela" value={`${pctInstallment}%`} />
              <LegendItem color={colors.amber} label="Custos" value={`${pctCosts}%`} />
              <LegendItem color={colors.green} label="Renda" value={`${pctIncome}%`} />
            </View>
          </Card>
        </>
      )}

      {/* Progresso da parcela */}
      {progress && (
        <>
          <Text style={styles.sectionLabel}>Progresso da parcela</Text>
          <Card>
            <ProgressBar
              progress={progress.percentage}
              label={`${formatCurrency(progress.accumulated)} de ${formatCurrency(progress.installment)}`}
              color={progressColor}
              height={14}
            />
            <View style={styles.progressDetail}>
              <View>
                <Text style={styles.progressDetailLabel}>Déficit</Text>
                <Text style={[styles.progressDetailValue, { color: progress.deficit > 0 ? colors.red : colors.green }]}>
                  {progress.deficit > 0 ? `- ${formatCurrency(progress.deficit)}` : 'Coberta!'}
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.progressDetailLabel}>Vencimento</Text>
                <Text style={styles.progressDetailValue}>{progress.days_until_due} dias</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.progressDetailLabel}>Meta/dia</Text>
                <Text style={[styles.progressDetailValue, { color: progress.deficit > 0 ? colors.amber : colors.green }]}>
                  {progress.deficit > 0 ? formatCurrency(progress.required_daily) : '—'}
                </Text>
              </View>
            </View>
          </Card>
        </>
      )}

      {/* Semana */}
      {data && (
        <>
          <Text style={styles.sectionLabel}>Semana</Text>
          <Card>
            <WeekBarChart data={buildWeekDays(data.calculated_daily_goal, weekEarnings)} />
          </Card>
        </>
      )}

      {/* AlertBoxes */}
      {progress && (
        <>
          <AlertBox
            variant={HEALTH_ALERT[progress.health_status].variant}
            message={HEALTH_ALERT[progress.health_status].text}
            style={{ marginTop: 16 }}
          />
          {progress.deficit > 0 && (
            <AlertBox
              variant="blue"
              icon="💡"
              message={progress.recovery_tip}
            />
          )}
        </>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={[styles.legendValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 16 },
  sectionLabel: {
    ...typography.micro,
    color: colors.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 20,
  },
  vehicleCard: { marginBottom: 10 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  vehicleIconWrap: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.greenBg,
    alignItems: 'center', justifyContent: 'center',
  },
  vehicleModel: { fontFamily: 'SpaceGrotesk', fontSize: 15, fontWeight: '600', color: colors.text },
  vehiclePlate: { ...typography.small, color: colors.text3, marginTop: 2 },
  vehicleBadge: {
    backgroundColor: colors.blueBg, borderWidth: 1, borderColor: colors.blueBorder,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
  },
  vehicleBadgeText: { ...typography.micro, color: colors.blue, fontWeight: '600' },
  installmentRow: { flexDirection: 'row', justifyContent: 'space-between' },
  installmentLabel: { ...typography.micro, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  installmentValue: { fontFamily: 'SpaceGrotesk', fontSize: 20, fontWeight: '700', color: colors.text },
  segmentedBar: {
    flexDirection: 'row', height: 10, borderRadius: radius.full,
    overflow: 'hidden', gap: 2, marginBottom: 14,
  },
  segment: { borderRadius: radius.full },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { ...typography.small, color: colors.text2 },
  legendValue: { ...typography.small, fontWeight: '700', marginLeft: 2 },
  progressDetail: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 14,
  },
  progressDetailLabel: { ...typography.micro, color: colors.text3, textTransform: 'uppercase', marginBottom: 4 },
  progressDetailValue: { fontFamily: 'SpaceGrotesk', fontSize: 15, fontWeight: '700', color: colors.text },
});
