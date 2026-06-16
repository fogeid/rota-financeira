import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, typography } from '../theme';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  color?: string;
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({ progress, label, color = colors.green, height = 7, style }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <View style={style}>
      {label !== undefined ? (
        <View style={styles.header}>
          <Text style={styles.title}>{label}</Text>
          <Text style={[styles.pct, { color }]}>{Math.round(clamped)}%</Text>
        </View>
      ) : null}
      <View style={[styles.track, { height }]}>
        <View style={[styles.fill, { width: `${clamped}%` as any, backgroundColor: color, height }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    ...typography.small,
    color: colors.text2,
  },
  pct: {
    ...typography.small,
    fontWeight: '600',
  },
  track: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.full,
  },
});
