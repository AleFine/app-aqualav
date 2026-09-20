/**
 * Design tokens for the app. Every color has a light and a dark variant so
 * screens never hardcode raw values.
 *
 * Alternatives if you outgrow StyleSheet: Nativewind, Tamagui or Unistyles.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    textSecondary: '#60646C',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    border: '#DDDDE3',
    tint: '#3C87F7',
    tintText: '#ffffff',
    /** Acento del login (equivalente a `colorAccent`). */
    accent: '#0F9B8E',
    /** Errores de formulario y textos destructivos. */
    danger: '#D93025',
    /** Extremos del degradado que hace de fondo en las pantallas de acceso. */
    gradientStart: '#0B2A6B',
    gradientEnd: '#3C87F7',
    /** Texto sobre el degradado: es oscuro en ambos esquemas. */
    onGradient: '#FFFFFF',
  },
  dark: {
    text: '#ffffff',
    textSecondary: '#B0B4BA',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    border: '#33363B',
    tint: '#4F97FF',
    tintText: '#ffffff',
    accent: '#03DAC5',
    danger: '#FF6B6B',
    gradientStart: '#05070F',
    gradientEnd: '#123A78',
    onGradient: '#FFFFFF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
} as const;

export const MaxContentWidth = 800;

/** Ancho máximo de las tarjetas de formulario (login, registro). */
export const MaxFormWidth = 420;

/** Sombra de las tarjetas elevadas (equivale a `cardElevation` en Android). */
export const Elevation = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;
