/**
 * GrowCircle — Onboarding Screen
 * The cinematic first impression. Three emotional steps:
 * 1. The Problem (isolation/failure alone)
 * 2. The Solution (visible accountability)
 * 3. The Oath (commitment to your circle)
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme/tokens';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🌑',
    title: 'Growth is lonely\nwhen no one sees it.',
    subtitle:
      'You set goals alone. You fail alone.\nNo one notices. No one cares.',
    gradient: ['#0A0A0F', '#1a0a1e'] as [string, string],
  },
  {
    emoji: '🔥',
    title: 'What if someone\nwas watching?',
    subtitle:
      'Imagine a partner who sees your wins,\ncalls out your excuses, and grows with you.',
    gradient: ['#0A0A0F', '#0d1a2e'] as [string, string],
  },
  {
    emoji: '🌳',
    title: 'Welcome to\nGrowCircle.',
    subtitle:
      'Your growth becomes visible.\nYour commitments become shared.\nYour excuses become impossible.',
    gradient: ['#0A0A0F', '#0a1e15'] as [string, string],
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isTransitioning = useRef(false);

  const goToNext = () => {
    if (isTransitioning.current) return;

    if (currentSlide >= SLIDES.length - 1) {
      onComplete();
      return;
    }

    isTransitioning.current = true;

    // Fade out → switch → Fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentSlide((prev) => prev + 1);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isTransitioning.current = false;
      });
    });
  };

  const slide = SLIDES[currentSlide] || SLIDES[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={slide.gradient}
        style={StyleSheet.absoluteFill}
      />

      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={onComplete}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </Animated.View>

      {/* Bottom section */}
      <View style={styles.bottom}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentSlide && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* CTA button */}
        <TouchableOpacity onPress={goToNext} activeOpacity={0.8}>
          <LinearGradient
            colors={Colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <Text style={styles.ctaText}>
              {currentSlide === SLIDES.length - 1
                ? 'Begin Your Journey'
                : 'Continue'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  skipBtn: {
    position: 'absolute',
    top: 60,
    right: Spacing.lg,
    zIndex: 10,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  skipText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.body,
    color: Colors.textTertiary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emoji: {
    fontSize: 72,
    marginBottom: Spacing.xl,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.heading,
    lineHeight: Typography.lineHeight.heading,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.body,
    lineHeight: Typography.lineHeight.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  bottom: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textTertiary,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.accentPrimary,
  },
  ctaButton: {
    height: 56,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.bodyLarge,
    color: Colors.textPrimary,
  },
});
