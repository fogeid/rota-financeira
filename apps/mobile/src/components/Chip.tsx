import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, typography } from '../theme';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({ label, active = false, onPress, style }: ChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.chip,
        active ? styles.active : styles.inactive,
        style,
      ]}
    >
      <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  inactive: {
    backgroundColor: colors.bg3,
    borderColor: colors.border,
  },
  active: {
    backgroundColor: colors.greenBg,
    borderColor: colors.greenBorder,
  },
  label: {
    ...typography.small,
    fontWeight: '500',
  },
  labelInactive: {
    color: colors.text2,
  },
  labelActive: {
    color: colors.green,
  },
});
