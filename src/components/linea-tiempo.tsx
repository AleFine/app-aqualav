import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Motion, Radius, Spacing, conAlfa } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { EstadoReserva, HistorialEstado } from '@/types/reserva';
import { COLOR_ESTADO, ICONO_ESTADO, etiquetaEstado, ordenEstados } from '@/utils/estados';
import { formatearFecha, formatearHora } from '@/utils/formato';

/**
 * Vertical timeline of the reservation states (RF-022).
 *
 * What happened comes from `historial`; what is left comes from the main flow
 * the API reports (`ordenEstados()`). An exception branch such as `cancelada`
 * is only ever rendered once it actually happened, never as a pending step.
 *
 * Visual language: the channel is a column of water. The completed stretch is
 * filled with a gradient that lightens as it descends, the way light fades
 * going deeper; the pending stretch is dry. The current state breathes, which
 * is what tells the customer the service is happening right now.
 */

const NODO = 30;
const NODO_ACTUAL = 36;
const CANAL = NODO_ACTUAL;

type LineaTiempoProps = {
  historial: HistorialEstado[];
  estadoActual: EstadoReserva;
};

type Paso = {
  estado: EstadoReserva;
  ocurrido_en: string | null;
  autor: string | null;
  completado: boolean;
  esActual: boolean;
};

function construirPasos(historial: HistorialEstado[], estadoActual: EstadoReserva): Paso[] {
  const porEstado = new Map<EstadoReserva, HistorialEstado>();
  historial.forEach((entrada) => porEstado.set(entrada.estado, entrada));

  // What actually happened, in the order the API reported it. Driving the
  // timeline off the history rather than off the main flow is what lets a state
  // added to `transicion_estado` after this build shipped still show up
  // (principle P3, RF-021 CA-03).
  const secuencia: EstadoReserva[] = [];
  historial.forEach((entrada) => {
    if (!secuencia.includes(entrada.estado)) secuencia.push(entrada.estado);
  });

  // Then the steps still ahead, so the user sees what is left. They come from
  // the MAIN FLOW the API derives from `transicion_estado`, so a step inserted
  // in v0.4 shows up as "Pendiente" with no code change. A reservation that
  // left the flow (cancelling) has nothing ahead, so nothing is appended.
  const flujo = ordenEstados();

  if (flujo.includes(estadoActual)) {
    const alcanzado = flujo.reduce(
      (ultimo, estado, indice) => (porEstado.has(estado) ? indice : ultimo),
      -1,
    );
    flujo.forEach((estado, indice) => {
      if (indice > alcanzado && !porEstado.has(estado)) secuencia.push(estado);
    });
  }

  return secuencia.map((estado) => {
    const entrada = porEstado.get(estado);

    return {
      estado,
      ocurrido_en: entrada?.ocurrido_en ?? null,
      autor: entrada?.autor ?? null,
      completado: !!entrada,
      esActual: estado === estadoActual,
    };
  });
}

/**
 * Halo del estado en curso. Respira lentamente para decir "esto esta pasando
 * ahora"; es la unica animacion continua de la pantalla, y se detiene cuando el
 * sistema pide reducir movimiento.
 */
const Halo = memo(function Halo({ color, activo }: { color: string; activo: boolean }) {
  const pulso = useSharedValue(0);
  const movimientoReducido = useReducedMotion();

  /*
   * El ciclo se arranca en un efecto, no dentro del worklet de estilo: un
   * `withRepeat` en `useAnimatedStyle` se relanzaria en cada render.
   */
  useEffect(() => {
    if (!activo || movimientoReducido) {
      pulso.value = 0;
      return;
    }
    pulso.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [activo, movimientoReducido, pulso]);

  const estilo = useAnimatedStyle(() => ({
    opacity: 0.45 - pulso.value * 0.28,
    transform: [{ scale: 1.08 + pulso.value * 0.28 }],
  }));

  if (!activo) return null;

  return (
    <Animated.View
      style={[styles.halo, { backgroundColor: conAlfa(color, 0.9) }, estilo]}
    />
  );
});

export const LineaTiempo = memo(function LineaTiempo({
  historial,
  estadoActual,
}: LineaTiempoProps) {
  const theme = useTheme();
  const movimientoReducido = useReducedMotion();
  const pasos = construirPasos(historial, estadoActual);

  return (
    <View style={styles.root}>
      {pasos.map((paso, indice) => {
        const color = paso.completado ? COLOR_ESTADO(paso.estado, theme) : theme.borderStrong;
        const esUltimo = indice === pasos.length - 1;
        const siguiente = pasos[indice + 1];

        /* El tramo esta mojado solo si el paso siguiente tambien ocurrio. */
        const tramoLleno = paso.completado && Boolean(siguiente?.completado);
        const colorSiguiente = siguiente
          ? COLOR_ESTADO(siguiente.estado, theme)
          : color;

        return (
          <Animated.View
            key={paso.estado}
            entering={
              movimientoReducido
                ? undefined
                : FadeInDown.delay(indice * Motion.stagger).duration(Motion.duration.slow)
            }
            style={styles.fila}
          >
            <View style={styles.canal}>
              <View style={styles.zonaNodo}>
                <Halo color={color} activo={paso.esActual && !esUltimo} />

                <View
                  style={[
                    styles.nodo,
                    paso.esActual && styles.nodoActual,
                    {
                      backgroundColor: paso.completado
                        ? conAlfa(color, 0.16)
                        : theme.surfaceSunken,
                      borderColor: color,
                      borderWidth: paso.esActual ? 2.5 : 2,
                    },
                  ]}
                >
                  {paso.completado ? (
                    <Icon
                      name={ICONO_ESTADO(paso.estado)}
                      size={paso.esActual ? 'md' : 'sm'}
                      color={color}
                    />
                  ) : (
                    /* Punto hueco: el paso existe, pero todavia no ocurrio. */
                    <View style={[styles.puntoPendiente, { backgroundColor: color }]} />
                  )}
                </View>
              </View>

              {!esUltimo ? (
                <View style={styles.tramo}>
                  {tramoLleno ? (
                    <LinearGradient
                      colors={[color, colorSiguiente]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.agua}
                    />
                  ) : (
                    <View
                      style={[styles.agua, { backgroundColor: conAlfa(theme.borderStrong, 0.5) }]}
                    />
                  )}
                </View>
              ) : null}
            </View>

            <View style={styles.contenido}>
              <ThemedText
                type={paso.esActual ? 'labelStrong' : 'small'}
                themeColor={paso.completado ? 'text' : 'textMuted'}
              >
                {etiquetaEstado(paso.estado)}
              </ThemedText>

              {paso.ocurrido_en ? (
                <View style={styles.meta}>
                  <Icon name="hora" size="xs" tone="textMuted" />
                  <ThemedText type="caption" themeColor="textSecondary" tabular>
                    {formatearFecha(paso.ocurrido_en)} · {formatearHora(paso.ocurrido_en)}
                    {paso.autor ? ` · ${paso.autor}` : ''}
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.meta}>
                  <Icon name="espera" size="xs" tone="textMuted" />
                  <ThemedText type="caption" themeColor="textMuted">
                    Pendiente
                  </ThemedText>
                </View>
              )}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    gap: 0,
  },
  fila: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  canal: {
    alignItems: 'center',
    width: CANAL,
  },
  zonaNodo: {
    width: CANAL,
    height: CANAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: NODO_ACTUAL,
    height: NODO_ACTUAL,
    borderRadius: Radius.full,
    pointerEvents: 'none',
  },
  nodo: {
    width: NODO,
    height: NODO,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodoActual: {
    width: NODO_ACTUAL,
    height: NODO_ACTUAL,
  },
  puntoPendiente: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    opacity: 0.55,
  },
  tramo: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.half,
  },
  agua: {
    flex: 1,
    width: 3,
    borderRadius: Radius.full,
  },
  contenido: {
    flex: 1,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    gap: Spacing.one,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
