import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';

interface DayData {
  day: string; // e.g. "SEG"
  value: number;
  goal: number;
}

interface WeekBarChartProps {
  data: DayData[];
}

export function WeekBarChart({ data }: WeekBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={styles.container}>
      {data.map((item, index) => {
        const hasData = item.value > 0;
        const metGoal = item.value >= item.goal;
        const barColor = !hasData ? colors.border2 : metGoal ? colors.green : colors.amber;
        const barHeight = hasData ? Math.max(4, (item.value / maxValue) * 52) : 8;

        return (
          <View key={index} style={styles.column}>
            {hasData && (
              <Text style={styles.valueLabel}>
                {item.value >= 1000
                  ? `${(item.value / 1000).toFixed(1)}k`
                  : String(item.value)}
              </Text>
            )}
            <View style={styles.barArea}>
              <View style={[styles.bar, { height: barHeight, backgroundColor: barColor }]} />
            </View>
            <Text style={styles.dayLabel}>{item.day}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  barArea: {
    height: 52,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 20,
    borderRadius: 4,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 9,
    fontFamily: 'Inter',
    color: colors.text3,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  valueLabel: {
    fontSize: 9,
    fontFamily: 'Inter',
    color: colors.text3,
    marginBottom: 2,
  },
});
