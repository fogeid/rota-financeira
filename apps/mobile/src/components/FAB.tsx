import React from 'react';
import { Platform, TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme';

interface FABProps {
  onPress: () => void;
  style?: ViewStyle;
}

export function FAB({ onPress, style }: FABProps) {
  return (
    <TouchableOpacity activeOpacity={0.85} style={[styles.fab, style]} onPress={onPress}>
      <Text style={styles.icon}>+</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 96,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: `0px 4px 10px ${colors.green}66` } as object,
      default: {
        shadowColor: colors.green,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  icon: {
    fontSize: 28,
    fontWeight: '300',
    color: '#0F1117',
    lineHeight: 32,
    marginTop: -2,
  },
});
