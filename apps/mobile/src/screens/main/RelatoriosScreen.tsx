import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import {
  HeroCard, MetricCard, MetricGrid, Card, AlertBox,
  SkeletonHeroCard, SkeletonMetricGrid,
} from '../../components';
import { useReportsStore } from '../../store/reportsStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { formatCurrency } from '../../utils/formatters';

type ReportTab = 'current' | 'previous' | 'annual';

const TAB_LABELS: Record<ReportTab, string> = {
  current: 'Mês atual',
  previous: 'Mês anterior',
  annual: String(new Date().getFullYear()),
};

function StatRow({ label, value, valueColor, delta }: { label: string; value: string; valueColor?: string; delta?: number }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {delta !== undefined && (
          <Text style={[styles.delta, { color: delta >= 0 ? colors.green : colors.red }]}>
            {delta >= 0 ? '+' : ''}{formatCurrency(Math.abs(delta))}
          </Text>
        )}
        <Text style={[styles.statValue, { color: valueColor ?? colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

export function RelatoriosScreen() {
  const { report, tab, isLoading, error, load, setTab } = useReportsStore();

  useEffect(() => {
    load();
  }, []);

  const isPro = useSubscriptionStore((s) => s.isPro());

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {error ? <AlertBox variant="red" message={error} style={{ marginBottom: spacing.md }} /> : null}

      {/* Period tabs */}
      <View style={styles.tabs}>
        {(Object.keys(TAB_LABELS) as ReportTab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {TAB_LABELS[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading || !report ? (
        <>
          <SkeletonHeroCard />
          <SkeletonMetricGrid />
        </>
      ) : (
        <>
          <HeroCard
            label="Lucro líquido"
            value={formatCurrency(report.net_income)}
            sub={`${formatDate(report.month)} · Ganho bruto: ${formatCurrency(report.gross_income)}`}
            variant={report.net_income >= 0 ? 'positive' : 'negative'}
          />

          <MetricGrid>
            <MetricCard label="Ganho bruto" value={formatCurrency(report.gross_income)} sub="Corridas + bônus" />
            <MetricCard
              label="Lucro real"
              value={formatCurrency(report.net_income)}
              sub="Após todos os custos"
            />
            <MetricCard label="Parcela paga" value={formatCurrency(report.installment_covered)} sub="Do financiamento" />
            <MetricCard
              label="Renda restante"
              value={formatCurrency(report.net_income - report.installment_covered)}
              sub="Para uso pessoal"
            />
          </MetricGrid>

          {/* Detalhamento */}
          <Text style={styles.sectionLabel}>Detalhamento</Text>
          <Card>
            <StatRow label="Ganho bruto" value={formatCurrency(report.gross_income)} valueColor={colors.green} />
            <StatRow label="Total de custos" value={`- ${formatCurrency(report.total_costs)}`} valueColor={colors.red} />
            <StatRow label="IR estimado" value={`- ${formatCurrency(report.estimated_tax)}`} valueColor={colors.red} />
            <StatRow label="Parcela" value={`- ${formatCurrency(report.installment_covered)}`} valueColor={colors.blue} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Lucro líquido</Text>
              <Text style={[styles.totalValue, { color: report.net_income >= 0 ? colors.green : colors.red }]}>
                {formatCurrency(report.net_income)}
              </Text>
            </View>
            <StatRow
              label="Custo/km"
              value={`R$ ${report.cost_per_km.toFixed(2).replace('.', ',')}`}
            />
            <StatRow label="Melhor dia" value={`${report.best_day.date.slice(8)} — ${formatCurrency(report.best_day.net)}`} valueColor={colors.green} />
            <StatRow label="Pior dia" value={`${report.worst_day.date.slice(8)} — ${formatCurrency(report.worst_day.net)}`} valueColor={colors.red} />
          </Card>

          {/* Comparativo */}
          <Text style={styles.sectionLabel}>Comparativo com mês anterior</Text>
          <Card>
            <StatRow
              label="Ganho bruto"
              value={formatCurrency(report.gross_income)}
              delta={report.vs_previous_month.gross_income}
            />
            <StatRow
              label="Lucro líquido"
              value={formatCurrency(report.net_income)}
              delta={report.vs_previous_month.net_income}
            />
          </Card>

          {/* Projeção */}
          <AlertBox
            variant="blue"
            icon="🤖"
            message={`Projeção para o próximo mês: ganho bruto ${formatCurrency(report.next_month_projection.gross_income)} · lucro ${formatCurrency(report.next_month_projection.net_income)} (média dos últimos 3 meses)`}
            style={{ marginTop: 16 }}
          />

          {/* Export PDF */}
          <TouchableOpacity
            style={[styles.exportBtn, !isPro && styles.exportBtnLocked]}
            onPress={() => {}}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={18} color={isPro ? colors.green : colors.text3} />
            <Text style={[styles.exportBtnText, !isPro && { color: colors.text3 }]}>
              {isPro ? 'Exportar PDF' : 'Exportar PDF (Premium)'}
            </Text>
            {!isPro && <Ionicons name="lock-closed-outline" size={14} color={colors.text3} />}
          </TouchableOpacity>
        </>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function formatDate(month: string): string {
  const [y, m] = month.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 16 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 99,
    backgroundColor: colors.bg3, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.greenBg, borderColor: colors.greenBorder },
  tabText: { ...typography.small, color: colors.text2 },
  tabTextActive: { color: colors.green, fontWeight: '600' },
  sectionLabel: {
    ...typography.micro, color: colors.text3,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 10, marginTop: 20,
  },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statLabel: { ...typography.label, color: colors.text2 },
  statValue: { fontFamily: 'SpaceGrotesk', fontSize: 14, fontWeight: '600' },
  delta: { ...typography.small, fontWeight: '600' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border2,
    marginVertical: 4,
  },
  totalLabel: { fontFamily: 'SpaceGrotesk', fontSize: 14, fontWeight: '700', color: colors.text },
  totalValue: { fontFamily: 'SpaceGrotesk', fontSize: 18, fontWeight: '700' },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.greenBg, borderWidth: 1, borderColor: colors.greenBorder,
    borderRadius: radius.sm, paddingVertical: 14, marginTop: 16,
  },
  exportBtnLocked: { backgroundColor: colors.bg3, borderColor: colors.border },
  exportBtnText: { ...typography.label, color: colors.green, fontWeight: '600' },
});
