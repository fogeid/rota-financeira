import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Animated,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { colors, radius } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: number;
}

export function BottomSheet({ visible, onClose, children, maxHeight = SCREEN_HEIGHT * 0.86 }: BottomSheetProps) {
  const slideAnim = useRef(new Animated.Value(maxHeight)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: maxHeight,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.overlay, { opacity: opacityAnim }]} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.sheet,
            { maxHeight, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.bg2,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border2,
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border2,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginVertical: 12,
  },
});
