/**
 * Aviso flotante: aparece sobre la pantalla y se oculta solo. El estado vive en
 * `useToast()`; este componente solo lo dibuja y lo desvanece.
 *
 * Animacion con Reanimated, no con el `Animated` del nucleo: la opacidad corre
 * en el hilo de interfaz y no se traba cuando la pantalla esta cargando datos.
 * Si el sistema pide reducir movimiento, el aviso aparece y desaparece sin
 * transicion, pero sigue durando lo mismo.
 *
 * La salida es mas corta que la entrada (`Motion.exitRatio`): asi lo hace todo
 * el resto de la app.
 */

import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Icon, type NombreIcono } from '@/components/ui/icon';
import { Motion, Radius, Spacing, ZIndex, elevacion } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TonoToast = 'neutral' | 'error' | 'success';

type ToastProps = {
  message: string | null;
  onHide: () => void;
  tone?: TonoToast;
  durationMs?: number;
};

export function Toast({ message, onHide, tone = 'neutral', durationMs = 2600 }: ToastProps) {
  const theme = useTheme();
  const opacidad = useSharedValue(0);
  const movimientoReducido = useReducedMotion();

  useEffect(() => {
    if (!message) return;

    const entrada = movimientoReducido ? 0 : Motion.duration.normal;
    const salida = movimientoReducido ? 0 : Math.round(Motion.duration.normal * Motion.exitRatio);

    opacidad.value = withTiming(1, { duration: entrada });

    let temporizadorSalida: ReturnType<typeof setTimeout> | undefined;
    const temporizadorEspera = setTimeout(() => {
      opacidad.value = withTiming(0, { duration: salida });
      temporizadorSalida = setTimeout(onHide, salida);
    }, durationMs);

    return () => {
      clearTimeout(temporizadorEspera);
      if (temporizadorSalida) clearTimeout(temporizadorSalida);
      opacidad.value = 0;
    };
  }, [durationMs, message, movimientoReducido, onHide, opacidad]);

  const estiloAnimado = useAnimatedStyle(() => ({ opacity: opacidad.value }));

  if (!message) {
    return null;
  }

  /* Cada tono trae su superficie, su color de texto y su icono. */
  const apariencia: Record<TonoToast, { fondo: string; texto: string; icono: NombreIcono }> = {
    neutral: { fondo: theme.surfaceRaised, texto: theme.text, icono: 'info' },
    error: { fondo: theme.danger, texto: theme.onSemantic, icono: 'error' },
    success: { fondo: theme.success, texto: theme.onSemantic, icono: 'exito' },
  };

  const { fondo, texto, icono } = apariencia[tone];

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        { backgroundColor: fondo },
        elevacion(3, theme.shadow),
        estiloAnimado,
      ]}>
      <Icon name={icono} size="sm" color={texto} />

      <ThemedText type="smallBold" style={[styles.text, { color: texto }]}>
        {message}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: Spacing.five,
    zIndex: ZIndex.toast,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    /* En el estilo, nunca como prop: la prop quedo obsoleta en React Native. */
    pointerEvents: 'none',
  },
  text: {
    flex: 1,
  },
});
