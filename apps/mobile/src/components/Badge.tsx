import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

type BadgeVariant = 'green' | 'amber' | 'red' | 'blue';

const variantMap: Record<BadgeVariant, { bg: string; border: string; color: string }> = {
  green: { bg: colors.greenBg, border: colors.greenBorder, color: colors.green },
  amber: { bg: colors.amberBg, border: colors.amberBorder, color: colors.amber },
  red:   { bg: colors.redBg,   border: colors.redBorder,   color: colors.red },
  blue:  { bg: colors.blueBg,  border: colors.blueBorder,  color: colors.blue },
};

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant, style }: BadgeProps) {
  const v = variantMap[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      <Text style={[styles.label, { color: v.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});
