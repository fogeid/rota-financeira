import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ConfirmButton } from '../../components';
import { colors, spacing, typography, radius } from '../../theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'trending-up-outline' as const,
    color: colors.green,
    title: 'Saiba quanto ganhar',
    body: 'Calculamos sua meta diária com base na sua parcela e renda desejada.',
  },
  {
    icon: 'sync-outline' as const,
    color: colors.blue,
    title: 'Sync automático',
    body: 'Conecte Uber e 99 para importar seus ganhos sem digitar nada.',
  },
  {
    icon: 'wallet-outline' as const,
    color: colors.amber,
    title: 'Controle de custos',
    body: 'Registre combustível, manutenção e lavagens para ver seu lucro real.',
  },
  {
    icon: 'document-text-outline' as const,
    color: colors.blue,
    title: 'Relatórios em PDF',
    body: 'Exporte relatórios mensais para declarar o Imposto de Renda facilmente.',
  },
];

type Props = NativeStackScreenProps<AuthStackParamList, 'Tutorial'>;

export function TutorialScreen({ navigation }: Props) {
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveSlide(idx);
  }

  function next() {
    if (activeSlide < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeSlide + 1) * SCREEN_WIDTH, animated: true });
    } else {
      finish();
    }
  }

  function finish() {
    // RootNavigator will redirect to main app because isAuthenticated === true
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipBtn} onPress={finish}>
        <Text style={styles.skipText}>Pular</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.slider}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={styles.slide}>
            <View style={[styles.iconWrap, { borderColor: slide.color + '40', backgroundColor: slide.color + '1A' }]}>
              <Ionicons name={slide.icon} size={56} color={slide.color} />
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeSlide && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <ConfirmButton
          label={activeSlide === SLIDES.length - 1 ? 'Começar' : 'Próximo'}
          onPress={next}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  skipBtn: { position: 'absolute', top: 52, right: spacing.xl, zIndex: 10, padding: spacing.sm },
  skipText: { ...typography.label, color: colors.text3 },
  slider: { flex: 1 },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: 80,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    ...typography.body,
    color: colors.text2,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border2,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.green,
  },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: 48 },
});
