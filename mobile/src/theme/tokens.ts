/**
 * GrowCircle — Design System Tokens
 * Mirrors the HTML/CSS prototype's glassmorphic, premium dark-mode aesthetic.
 * All components MUST use these tokens. No ad-hoc colors or spacing.
 */

import { Platform } from 'react-native';

export const Colors = {
  // ── Core Palette ──────────────────────────────────────────────────────
  background: '#0A0A0F',
  backgroundElevated: '#12121A',
  surface: 'rgba(255, 255, 255, 0.04)',
  surfaceHover: 'rgba(255, 255, 255, 0.08)',
  surfaceActive: 'rgba(255, 255, 255, 0.12)',
  glass: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',

  // ── Text ──────────────────────────────────────────────────────────────
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textTertiary: 'rgba(255, 255, 255, 0.35)',
  textDisabled: 'rgba(255, 255, 255, 0.2)',

  // ── Accent Colors ────────────────────────────────────────────────────
  accentPrimary: '#7C5CFC',     // Main purple
  accentSecondary: '#5B8DEF',   // Blue
  accentSuccess: '#34D399',     // Green — goal completed
  accentWarning: '#FBBF24',     // Amber — streak at risk
  accentDanger: '#EF4444',      // Red — streak broken, urgent
  accentFire: '#F97316',        // Orange — fire emoji, hot streak

  // ── Gradients ─────────────────────────────────────────────────────────
  gradientPrimary: ['#7C5CFC', '#5B8DEF'] as const,
  gradientSuccess: ['#34D399', '#059669'] as const,
  gradientDanger: ['#EF4444', '#DC2626'] as const,
  gradientFire: ['#F97316', '#EF4444'] as const,
  gradientGold: ['#FBBF24', '#F59E0B'] as const,

  // ── Garden / Ecosystem ────────────────────────────────────────────────
  gardenThriving: '#34D399',
  gardenWilting: '#FBBF24',
  gardenDead: '#6B7280',

  // ── Partner Presence ──────────────────────────────────────────────────
  presenceOnline: '#34D399',
  presenceOffline: 'rgba(255, 255, 255, 0.2)',
  presenceAway: '#FBBF24',
} as const;

export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

export const Typography = {
  // Font families (loaded via expo-font)
  fontFamily: {
    regular: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    medium: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    semiBold: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    bold: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    black: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },

  // Font sizes
  size: {
    caption: 11,
    small: 13,
    body: 15,
    bodyLarge: 17,
    subtitle: 19,
    title: 22,
    heading: 28,
    hero: 36,
    display: 48,
  },

  // Line heights (approx 1.4x the font size)
  lineHeight: {
    caption: 16,
    small: 18,
    body: 22,
    bodyLarge: 24,
    subtitle: 26,
    title: 30,
    heading: 36,
    hero: 44,
    display: 56,
  },
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  }),
} as const;

export const Animation = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },
  spring: {
    gentle: { damping: 20, stiffness: 150 },
    bouncy: { damping: 12, stiffness: 200 },
    snappy: { damping: 25, stiffness: 300 },
    fluid: { damping: 30, stiffness: 100 },
  },
} as const;
