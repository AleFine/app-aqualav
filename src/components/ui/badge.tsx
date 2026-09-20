import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Small pill used for statuses, categories and counters. `tone` covers the
 * common cases; `color` overrides it when the caller already resolved a theme
 * color (see `EstadoBadge`).
 */

export type BadgeTone = 'neutral' | 'info' | 'exito' | 'alerta' | 'peligro';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  /** Resolved color that wins over `tone`. */
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export const Badge = memo(function Badge({
  label,
  tone = 'neutral',
  color,
  style,
}: BadgeProps) {
  const theme = useTheme();

  const colorPorTono: Record<BadgeTone, string> = {
    neutral: theme.textSecondary,
    info: theme.tint,
    exito: theme.accent,
    alerta: theme.text,
    peligro: theme.danger,
  };

  const resuelto = color ?? colorPorTono[tone];

  return (
    <View
      style={[
        styles.badge,
        { borderColor: resuelto, backgroundColor: theme.backgroundElement },
        style,
      ]}>
      <ThemedText type="small" style={[styles.label, { color: resuelto }]}>
        {label}
      </ThemedText>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
});
