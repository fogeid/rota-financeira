import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import {
  HeroCard, MetricCard, MetricGrid, AlertBox, WeekBarChart, Card,
  ListItem, Badge, SkeletonHeroCard, SkeletonMetricGrid,
} from '../../components';
import { useHomeStore } from '../../store/homeStore';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/formatters';
import type { IntegrationStatus } from '../../types/api';

const PLATFORM_LABEL: Record<string, string> = {
  UBER: 'Uber',
  NOVENTA_E_NOVE: '99',
  IFOOD: 'iFood',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatDate(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function syncLabel(s: IntegrationStatus): string {
  if (!s.last_sync_at) return 'Nunca sincronizado';
  const diff = Date.now() - new Date(s.last_sync_at).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Sync há menos de 1h';
  return `Sync há ${h}h`;
}

interface Props {
  onRegisterEarning?: () => void;
  onRegisterCost?: () => void;
}

export function HomeScreen({ onRegisterEarning, onRegisterCost }: Props) {
  const { data, isLoading, error, load } = useHomeStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    load();
  }, []);

  return (
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
        <TouchableOpacity style={styles.quickBtn} onPress={onRegisterEarning} activeOpacity={0.75}>
          <Ionicons name="add-circle-outline" size={18} color={colors.green} />
          <Text style={styles.quickBtnText}>Registrar corrida</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={onRegisterCost} activeOpacity={0.75}>
          <Ionicons name="receipt-outline" size={18} color={colors.green} />
          <Text style={styles.quickBtnText}>Registrar gasto</Text>
        </TouchableOpacity>
      </View>

      {/* MetricGrid */}
      {isLoading || !data ? (
        <SkeletonMetricGrid />
      ) : (
        <MetricGrid>
          <MetricCard
            label="Parcela"
            value={formatCurrency(data.installment)}
            sub={`Vence em ${data.days_until_due} dias`}
          />
          <MetricCard label="IR estimado" value={formatCurrency(data.estimated_tax)} sub="Este mês" />
          <MetricCard
            label="Semana"
            value={formatCurrency(data.week_earnings)}
            sub="+12% vs. semana passada"
          />
          <MetricCard
            label="Custo/km"
            value={`R$ ${data.cost_per_km.toFixed(2).replace('.', ',')}`}
            sub="Média mensal"
          />
        </MetricGrid>
      )}

      {/* Alerts (max 2) */}
      {data?.alerts.map((a, i) => (
        <AlertBox key={i} variant={a.variant} message={a.message} />
      ))}

      {/* Semana */}
      <Text style={styles.sectionLabel}>Semana</Text>
      <Card>
        {data ? (
          <WeekBarChart data={data.week_data} />
        ) : (
          <View style={{ height: 80 }} />
        )}
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
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  date: { ...typography.small, color: colors.text3, marginTop: 2 },
  sectionLabel: {
    ...typography.micro,
    color: colors.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 20,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    marginTop: 4,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.greenBg,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: 10,
    paddingVertical: 10,
  },
  quickBtnText: {
    ...typography.label,
    color: colors.green,
    fontWeight: '600',
  },
  platformIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
