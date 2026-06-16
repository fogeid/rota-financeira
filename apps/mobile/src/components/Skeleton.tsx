import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = '100%', height = 16, style }: SkeletonBoxProps) {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.box,
        { width: width as number, height, opacity: anim },
        style,
      ]}
    />
  );
}

export function SkeletonHeroCard() {
  return (
    <View style={styles.heroCard}>
      <SkeletonBox width={120} height={11} style={{ marginBottom: 8 }} />
      <SkeletonBox width={180} height={38} style={{ marginBottom: 8 }} />
      <SkeletonBox width={200} height={11} style={{ marginBottom: 16 }} />
      <SkeletonBox width="100%" height={7} />
    </View>
  );
}

export function SkeletonMetricGrid() {
  return (
    <View style={styles.metricGrid}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.metricCard}>
          <SkeletonBox width={80} height={10} style={{ marginBottom: 6 }} />
          <SkeletonBox width={100} height={18} style={{ marginBottom: 4 }} />
          <SkeletonBox width={70} height={10} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonListItem({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.listItem}>
          <SkeletonBox width={36} height={36} style={{ borderRadius: radius.sm, marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <SkeletonBox width={140} height={13} style={{ marginBottom: 6 }} />
            <SkeletonBox width={80} height={10} />
          </View>
          <SkeletonBox width={60} height={14} />
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.border2,
    borderRadius: radius.xs,
  },
  heroCard: {
    backgroundColor: colors.bg3,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.bg3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 13,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
