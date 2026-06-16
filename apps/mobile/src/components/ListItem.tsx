import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

interface ListItemProps {
  icon?: React.ReactNode;
  name: string;
  sub?: string;
  value?: string;
  valueColor?: string;
  isLast?: boolean;
  style?: ViewStyle;
  right?: React.ReactNode;
}

export function ListItem({ icon, name, sub, value, valueColor, isLast, style, right }: ListItemProps) {
  return (
    <View style={[styles.item, !isLast && styles.divider, style]}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      {value ? (
        <Text style={[styles.value, { color: valueColor ?? colors.text }]}>{value}</Text>
      ) : null}
      {right ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: spacing.sm,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.label,
    color: colors.text,
  },
  sub: {
    ...typography.small,
    color: colors.text3,
    marginTop: 1,
  },
  value: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 14,
    fontWeight: '600',
  },
});
