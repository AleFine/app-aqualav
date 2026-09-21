import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { EstadoBadge } from '@/components/estado-badge';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Reserva } from '@/types/reserva';
import { COLOR_ESTADO, ICONO_TIPO_VEHICULO } from '@/utils/estados';
import { formatearDinero, formatearFecha, formatearRangoHorario } from '@/utils/formato';

/**
 * List item of every reservation list (client history, staff operation board).
 *
 * The left rail repeats the state colour that the badge already names in text,
 * so a long list can be scanned by colour without that colour ever being the
 * only carrier of the information.
 */

type ReservaCardProps = {
  reserva: Reserva;
  onPress: (id: number) => void;
};

export const ReservaCard = memo(function ReservaCard({ reserva, onPress }: ReservaCardProps) {
  const theme = useTheme();
  const handlePress = useCallback(() => onPress(reserva.id), [onPress, reserva.id]);

  const colorEstado = COLOR_ESTADO(reserva.estado, theme);

  return (
    <Card
      onPress={handlePress}
      accessibilityLabel={`Reserva ${reserva.codigo}, ${reserva.servicio.nombre}`}
      style={styles.tarjeta}
    >
      <View style={[styles.riel, { backgroundColor: colorEstado }]} />

      <View style={styles.encabezado}>
        <ThemedText type="labelStrong" themeColor="textSecondary" tabular>
          {reserva.codigo}
        </ThemedText>
        <EstadoBadge estado={reserva.estado} />
      </View>

      <ThemedText type="bodyStrong" numberOfLines={1}>
        {reserva.servicio.nombre}
      </ThemedText>

      <View style={styles.fila}>
        <Icon name={ICONO_TIPO_VEHICULO[reserva.vehiculo.tipo] ?? 'vehiculos'} size="xs" />
        <ThemedText type="caption" themeColor="textSecondary" tabular numberOfLines={1}>
          {reserva.vehiculo.placa} · {reserva.vehiculo.marca} {reserva.vehiculo.modelo}
        </ThemedText>
      </View>

      <View style={styles.pie}>
        <View style={styles.fila}>
          <Icon name="fecha" size="xs" />
          <ThemedText type="caption" themeColor="textSecondary" tabular numberOfLines={1}>
            {formatearFecha(reserva.inicio)} ·{' '}
            {formatearRangoHorario(reserva.inicio, reserva.fin)}
          </ThemedText>
        </View>

        <ThemedText type="heading" themeColor="brand" tabular>
          {formatearDinero(reserva.monto)}
        </ThemedText>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  tarjeta: {
    /* Deja sitio al riel de estado sin desalinear el texto. */
    paddingLeft: Spacing.three + Spacing.one,
  },
  riel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopRightRadius: Radius.xs,
    borderBottomRightRadius: Radius.xs,
    pointerEvents: 'none',
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexShrink: 1,
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.half,
  },
});
