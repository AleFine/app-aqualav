import { StyleSheet, View, type ViewProps } from 'react-native';

import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  /**
   * `flat` para listas dentro de una pantalla; `elevated` para las tarjetas de
   * formulario sobre el degradado (equivale a `CardView` con `cardElevation`).
   */
  variant?: 'flat' | 'elevated';
};

export function Card({ style, variant = 'flat', ...rest }: CardProps) {
  const theme = useTheme();
  const isElevated = variant === 'elevated';

  return (
    <View
      style={[
        styles.card,
        isElevated
          ? [styles.elevated, { backgroundColor: theme.background }]
          : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  elevated: {
    borderRadius: Radius.lg,
    borderWidth: 0,
    padding: Spacing.four,
    gap: Spacing.three,
    ...Elevation.card,
  },
});
