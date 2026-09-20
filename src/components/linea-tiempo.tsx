import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { EstadoReserva, HistorialEstado } from '@/types/reserva';
import { COLOR_ESTADO, etiquetaEstado, ordenEstados } from '@/utils/estados';
import { formatearFecha, formatearHora } from '@/utils/formato';

/**
 * Vertical timeline of the reservation states (RF-022).
 *
 * What happened comes from `historial`; what is left comes from the main flow
 * the API reports (`ordenEstados()`). An exception branch such as `cancelada`
 * is only ever rendered once it actually happened, never as a pending step.
 */

const TAMANIO_PUNTO = 14;

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

export const LineaTiempo = memo(function LineaTiempo({
  historial,
  estadoActual,
}: LineaTiempoProps) {
  const theme = useTheme();
  const pasos = construirPasos(historial, estadoActual);

  return (
    <View style={styles.root}>
      {pasos.map((paso, indice) => {
        const color = paso.completado ? COLOR_ESTADO(paso.estado, theme) : theme.border;
        const esUltimo = indice === pasos.length - 1;

        return (
          <View key={paso.estado} style={styles.fila}>
            <View style={styles.canal}>
              <View
                style={[
                  styles.punto,
                  { borderColor: color },
                  paso.completado ? { backgroundColor: color } : null,
                  paso.esActual ? styles.puntoActual : null,
                ]}
              />
              {!esUltimo ? (
                <View style={[styles.conector, { backgroundColor: color }]} />
              ) : null}
            </View>

            <View style={styles.contenido}>
              <ThemedText
                type={paso.esActual ? 'smallBold' : 'small'}
                themeColor={paso.completado ? 'text' : 'textSecondary'}>
                {etiquetaEstado(paso.estado)}
              </ThemedText>

              {paso.ocurrido_en ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {formatearFecha(paso.ocurrido_en)} · {formatearHora(paso.ocurrido_en)}
                  {paso.autor ? ` · ${paso.autor}` : ''}
                </ThemedText>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Pendiente
                </ThemedText>
              )}
            </View>
          </View>
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
    width: TAMANIO_PUNTO,
  },
  punto: {
    width: TAMANIO_PUNTO,
    height: TAMANIO_PUNTO,
    borderRadius: Radius.full,
    borderWidth: 2,
    marginTop: Spacing.half,
  },
  puntoActual: {
    transform: [{ scale: 1.25 }],
  },
  conector: {
    flex: 1,
    width: 2,
    marginVertical: Spacing.one,
  },
  contenido: {
    flex: 1,
    paddingBottom: Spacing.three,
    gap: Spacing.half,
  },
});
