import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, typography } from '../theme';
import { ProgressBar } from './ProgressBar';

interface HeroCardProps {
  label: string;
  value: string;
  sub?: string;
  variant?: 'positive' | 'negative';
  progress?: number;
  progressLabel?: string;
}

export function HeroCard({ label, value, sub, variant = 'positive', progress, progressLabel }: HeroCardProps) {
  const gradientColors = variant === 'positive'
    ? (['#162F25', '#1a2d3d'] as const)
    : (['#2d1818', '#2d201a'] as const);

  const accentColor = variant === 'positive' ? colors.green : colors.red;

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={[styles.label, { color: accentColor + 'B3' }]}>{label}</Text>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      {progress !== undefined ? (
        <ProgressBar
          progress={progress}
          label={progressLabel}
          color={accentColor}
          style={styles.progress}
        />
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: 'rgba(46,204,138,0.2)',
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 10,
    overflow: 'hidden',
  },
  label: {
    ...typography.micro,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  value: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 38,
    fontWeight: '700',
    lineHeight: 42,
    marginBottom: 4,
  },
  sub: {
    ...typography.small,
    color: colors.text2,
  },
  progress: {
    marginTop: 14,
  },
});
