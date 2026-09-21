/**
 * Lienzo de una pantalla.
 *
 * Resuelve el area segura, limita el ancho de lectura y aplica el margen
 * lateral estandar. `variant` decide la profundidad del lienzo: `plano` es el
 * fondo habitual y `hundido` usa la superficie hundida, para pantallas cuyo
 * contenido son tarjetas que deben verse flotando sobre el lienzo.
 */

import { StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type VariantePantalla = 'plano' | 'hundido';

type ScreenProps = ViewProps & {
  /** Bordes del area segura a respetar. Por defecto solo el superior: las pestanias resuelven el inferior. */
  edges?: readonly Edge[];
  padded?: boolean;
  variant?: VariantePantalla;
};

const DEFAULT_EDGES: readonly Edge[] = ['top'];

export function Screen({
  style,
  edges = DEFAULT_EDGES,
  padded = true,
  variant = 'plano',
  children,
  ...rest
}: ScreenProps) {
  const theme = useTheme();

  const fondo = variant === 'hundido' ? theme.surfaceSunken : theme.background;

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: fondo }, style]} {...rest}>
      <SafeAreaView edges={[]} style={[styles.content, padded && styles.padded]}>
        {children}
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  padded: {
    paddingHorizontal: Spacing.three,
  },
});
