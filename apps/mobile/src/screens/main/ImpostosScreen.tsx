import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { Card, AlertBox, ProgressBar, SkeletonHeroCard } from '../../components';
import { useTaxesStore } from '../../store/taxesStore';
import { formatCurrency } from '../../utils/formatters';
import type { TaxMonth } from '../../types/api';

const STATUS_CONFIG = {
  PAID: { label: 'Pago', color: colors.green, bg: colors.greenBg, border: colors.greenBorder },
  PENDING: { label: 'Pendente', color: colors.amber, bg: colors.amberBg, border: colors.amberBorder },
  OVERDUE: { label: 'Vencido', color: colors.red, bg: colors.redBg, border: colors.redBorder },
};

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function monthLabel(month: string): string {
  const [, m] = month.split('-');
  return MONTH_NAMES[parseInt(m) - 1] ?? month;
}

function HistoryItem({ item, onMarkPaid }: { item: TaxMonth; onMarkPaid: (month: string) => void }) {
  const cfg = STATUS_CONFIG[item.status];
  return (
    <View style={styles.historyItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.historyMonth}>{monthLabel(item.month)} {item.month.slice(0, 4)}</Text>
        <Text style={styles.historyBase}>Base: {formatCurrency(item.taxable_income)} · {item.tax_bracket}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={[styles.historyAmount, { color: item.tax_amount === 0 ? colors.text3 : colors.text }]}>
          {item.tax_amount === 0 ? 'Isento' : formatCurrency(item.tax_amount)}
        </Text>
        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
          onPress={() => item.status === 'PENDING' || item.status === 'OVERDUE' ? onMarkPaid(item.month) : undefined}
          disabled={item.status === 'PAID'}
          activeOpacity={item.status === 'PAID' ? 1 : 0.75}
        >
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function ImpostosScreen() {
  const { current, history, isLoading, error, load, markPaid } = useTaxesStore();

  useEffect(() => {
    load();
  }, []);

  const deductionPct = current && current.gross_income > 0
    ? Math.round((current.deductions / current.gross_income) * 100)
    : 0;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {error ? <AlertBox variant="red" message={error} style={{ marginBottom: spacing.md }} /> : null}

      {/* Reserve card */}
      {isLoading || !current ? (
        <SkeletonHeroCard />
      ) : (
        <View style={styles.reserveCard}>
          <Text style={styles.reserveLabel}>IMPOSTO ESTIMADO ESTE MÊS</Text>
          <Text style={styles.reserveValue}>{formatCurrency(current.tax_amount)}</Text>
          <Text style={styles.reserveSub}>{current.reserve_message}</Text>
          {current.tax_amount > 0 && (
            <View style={styles.reserveDue}>
              <Ionicons name="calendar-outline" size={13} color={colors.amber} />
              <Text style={styles.reserveDueText}>
                Vence em {new Date(current.due_date).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Calculation detail */}
      {current && (
        <>
          <Text style={styles.sectionLabel}>Cálculo detalhado</Text>
          <Card>
            <DetailRow label="Ganho bruto" value={formatCurrency(current.gross_income)} />
            <DetailRow label="Deduções permitidas" value={`- ${formatCurrency(current.deductions)}`} valueColor={colors.green} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Base de cálculo</Text>
              <Text style={styles.totalValue}>{formatCurrency(current.taxable_income)}</Text>
            </View>
            <DetailRow label="Alíquota" value={current.tax_bracket} />
            <DetailRow
              label="IR estimado"
              value={current.tax_amount === 0 ? 'Isento' : formatCurrency(current.tax_amount)}
              valueColor={current.tax_amount === 0 ? colors.green : colors.red}
            />
          </Card>

          <ProgressBar
            progress={deductionPct}
            label={`Deduções (${deductionPct}% do ganho bruto)`}
            color={colors.green}
            style={{ marginTop: 16 }}
          />

          <AlertBox
            variant="blue"
            icon="ℹ️"
            message="Estimativa baseada na Tabela IRPF 2026. Não substitui consultoria contábil profissional."
            style={{ marginTop: 12 }}
          />
        </>
      )}

      {/* History */}
      <Text style={styles.sectionLabel}>Histórico de recolhimentos</Text>
      <Card>
        {history.map((item, i) => (
          <View key={item.month}>
            <HistoryItem item={item} onMarkPaid={markPaid} />
            {i < history.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </Card>

      {/* Step-by-step guide */}
      <Text style={styles.sectionLabel}>Como pagar o carnê-leão</Text>
      <Card>
        {STEPS.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </Card>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const STEPS = [
  { title: 'Acesse o site da Receita Federal', desc: 'Vá em gov.br/receitafederal → e-CAC → Carnê-Leão' },
  { title: 'Informe seus rendimentos', desc: 'Lance o total recebido das plataformas no mês' },
  { title: 'Informe as deduções', desc: 'Inclua combustível e manutenção registrados no app' },
  { title: 'Gere o DARF', desc: 'O sistema calcula o valor e gera o código de barras' },
  { title: 'Pague até o último dia útil', desc: 'Pague via internet banking ou lotérica' },
];

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, { color: valueColor ?? colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 16 },
  reserveCard: {
    backgroundColor: colors.amberBg,
    borderWidth: 1, borderColor: colors.amberBorder,
    borderRadius: radius.lg, padding: 20, marginBottom: 10,
  },
  reserveLabel: { ...typography.micro, color: colors.amber + 'B3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  reserveValue: { fontFamily: 'SpaceGrotesk', fontSize: 38, fontWeight: '700', color: colors.amber, marginBottom: 4 },
  reserveSub: { ...typography.small, color: colors.text2 },
  reserveDue: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  reserveDueText: { ...typography.small, color: colors.amber },
  sectionLabel: {
    ...typography.micro, color: colors.text3,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 10, marginTop: 20,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  detailLabel: { ...typography.label, color: colors.text2 },
  detailValue: { fontFamily: 'SpaceGrotesk', fontSize: 14, fontWeight: '600' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: colors.border2, marginVertical: 4,
  },
  totalLabel: { fontFamily: 'SpaceGrotesk', fontSize: 14, fontWeight: '700', color: colors.text },
  totalValue: { fontFamily: 'SpaceGrotesk', fontSize: 15, fontWeight: '700', color: colors.text },
  historyItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 12,
  },
  historyMonth: { fontFamily: 'SpaceGrotesk', fontSize: 14, fontWeight: '600', color: colors.text },
  historyBase: { ...typography.small, color: colors.text3, marginTop: 2 },
  historyAmount: { fontFamily: 'SpaceGrotesk', fontSize: 14, fontWeight: '600' },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.full, borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: '600', fontFamily: 'Inter' },
  divider: { height: 1, backgroundColor: colors.border },
  stepRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  stepNumber: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.greenBg, borderWidth: 1, borderColor: colors.greenBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumberText: { ...typography.micro, color: colors.green, fontWeight: '700' },
  stepTitle: { ...typography.label, color: colors.text, fontWeight: '600', marginBottom: 2 },
  stepDesc: { ...typography.small, color: colors.text2 },
});
