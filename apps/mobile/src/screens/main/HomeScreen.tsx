import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { HeroCard, MetricCard, MetricGrid, AlertBox, WeekBarChart, Card } from '../../components';

export function HomeScreen() {
  const weekData = [
    { day: 'SEG', value: 320, goal: 280 },
    { day: 'TER', value: 210, goal: 280 },
    { day: 'QUA', value: 290, goal: 280 },
    { day: 'QUI', value: 0,   goal: 280 },
    { day: 'SEX', value: 410, goal: 280 },
    { day: 'SAB', value: 380, goal: 280 },
    { day: 'DOM', value: 0,   goal: 280 },
  ];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bom dia, Carlos 👋</Text>
          <Text style={styles.date}>Segunda, 16 de junho</Text>
        </View>
      </View>

      <HeroCard
        label="Lucro líquido hoje"
        value="R$ 187,40"
        sub="Meta: R$ 280,00 · 67% concluída"
        variant="positive"
        progress={67}
        progressLabel="Meta diária"
      />

      <MetricGrid>
        <MetricCard label="Parcela" value="R$ 1.200" sub="Vence em 14 dias" />
        <MetricCard label="IR estimado" value="R$ 340" sub="Este mês" />
        <MetricCard label="Semana" value="R$ 1.610" sub="+12% vs. semana passada" />
        <MetricCard label="Custo/km" value="R$ 0,42" sub="Média mensal" />
      </MetricGrid>

      <AlertBox variant="amber" message="Você está 33% abaixo da meta de hoje. Ainda dá tempo de recuperar!" />

      <Text style={styles.sectionLabel}>Semana</Text>
      <Card>
        <WeekBarChart data={weekData} />
      </Card>

      <Text style={styles.sectionLabel}>Plataformas</Text>
      <Card>
        <Text style={[typography.label, { color: colors.text2 }]}>
          Nenhuma plataforma conectada. Vá em Perfil para conectar.
        </Text>
      </Card>
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
});
