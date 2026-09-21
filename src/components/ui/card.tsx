/**
 * Superficie de AquaLav.
 *
 * La elevacion es profundidad: cuanto mas sube una superficie, mas clara es y
 * mas separada esta del lienzo. Cada tarjeta lleva un filo superior mas claro
 * (`topLight`) porque en este sistema la luz siempre cae desde arriba; es un
 * detalle de un pixel, y es lo que hace que la superficie se sienta fisica.
 *
 * Con `onPress` la tarjeta se vuelve presionable y hereda la misma respuesta
 * tactil que el boton, en lugar de que cada pantalla envuelva su propio
 * `Pressable` con estilos distintos.
 */

import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import Animated from 'react-native-reanimated';

import { Radius, Spacing, elevacion } from '@/constants/theme';
import { usePresion } from '@/hooks/use-presion';
import { useTheme } from '@/hooks/use-theme';

export type VarianteCard =
  /** Contenido dentro de una lista: hundida respecto al lienzo. */
  | 'flat'
  /** Bloque destacado: hojas, formularios, resumenes. */
  | 'elevated'
  /** Contenedor pasivo: pistas de progreso, celdas vacias. */
  | 'sunken'
  /** Resalte de marca: totales, estados activos, avisos informativos. */
  | 'brand';

export type CardProps = ViewProps & {
  variant?: VarianteCard;
  /** Convierte la tarjeta en una superficie presionable. */
  onPress?: () => void;
  /** Etiqueta accesible cuando la tarjeta es presionable. */
  accessibilityLabel?: string;
};

export function Card({
  variant = 'flat',
  onPress,
  style,
  children,
  accessibilityLabel,
  ...rest
}: CardProps) {
  const theme = useTheme();
  const { estiloAnimado, alPresionar, alSoltar } = usePresion({
    inhabilitado: onPress === undefined,
  });

  const superficie = {
    flat: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: Radius.md,
      padding: Spacing.three,
      gap: Spacing.two,
      ...elevacion(1, theme.shadow),
    },
    elevated: {
      backgroundColor: theme.surfaceRaised,
      borderColor: theme.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: Radius.lg,
      padding: Spacing.four,
      gap: Spacing.three,
      ...elevacion(2, theme.shadow),
    },
    sunken: {
      backgroundColor: theme.surfaceSunken,
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: Radius.md,
      padding: Spacing.three,
      gap: Spacing.two,
      ...elevacion(0, theme.shadow),
    },
    brand: {
      backgroundColor: theme.brandSoft,
      borderColor: theme.brandMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: Radius.md,
      padding: Spacing.three,
      gap: Spacing.two,
      ...elevacion(0, theme.shadow),
    },
  }[variant];

  const cuerpo = (
    <Animated.View
      style={[styles.base, superficie, onPress ? estiloAnimado : undefined, style]}
      {...(onPress ? {} : rest)}
    >
      {/* Filo de luz: ausente en superficies hundidas, que no sobresalen. */}
      {variant !== 'sunken' ? (
        <View style={[styles.filoLuz, { backgroundColor: theme.topLight }]} />
      ) : null}
      {children}
    </Animated.View>
  );

  if (!onPress) return cuerpo;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={alPresionar}
      onPressOut={alSoltar}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      {...rest}
    >
      {cuerpo}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  filoLuz: {
    position: 'absolute',
    top: 0,
    left: Spacing.three,
    right: Spacing.three,
    height: StyleSheet.hairlineWidth,
    pointerEvents: 'none',
  },
});
