import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, typography } from '../theme';

type AlertVariant = 'green' | 'amber' | 'red' | 'blue';

const variantMap: Record<AlertVariant, { bg: string; border: string; color: string; icon: string }> = {
  green: { bg: colors.greenBg, border: colors.greenBorder, color: colors.green, icon: '✅' },
  amber: { bg: colors.amberBg, border: colors.amberBorder, color: colors.amber, icon: '⚠️' },
  red:   { bg: colors.redBg,   border: colors.redBorder,   color: colors.red,   icon: '🔴' },
  blue:  { bg: colors.blueBg,  border: colors.blueBorder,  color: colors.blue,  icon: 'ℹ️' },
};

interface AlertBoxProps {
  variant: AlertVariant;
  message: string;
  icon?: string;
  style?: ViewStyle;
}

export function AlertBox({ variant, message, icon, style }: AlertBoxProps) {
  const v = variantMap[variant];
  return (
    <View style={[styles.box, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      <Text style={styles.icon}>{icon ?? v.icon}</Text>
      <Text style={[styles.text, { color: v.color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  icon: {
    fontSize: 14,
    lineHeight: 18,
  },
  text: {
    ...typography.small,
    flex: 1,
    lineHeight: 18,
  },
});
