import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EstadoBadge } from '@/components/estado-badge';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import type { Reserva } from '@/types/reserva';
import { formatearDinero, formatearFecha, formatearRangoHorario } from '@/utils/formato';

/** List item of every reservation list (client history, staff operation board). */

type ReservaCardProps = {
  reserva: Reserva;
  onPress: (id: number) => void;
};

export const ReservaCard = memo(function ReservaCard({ reserva, onPress }: ReservaCardProps) {
  const handlePress = useCallback(() => onPress(reserva.id), [onPress, reserva.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Reserva ${reserva.codigo}`}
      onPress={handlePress}
      style={({ pressed }) => (pressed ? styles.pressed : null)}>
      <Card>
        <View style={styles.encabezado}>
          <ThemedText type="smallBold">{reserva.codigo}</ThemedText>
          <EstadoBadge estado={reserva.estado} />
        </View>

        <ThemedText type="small">{reserva.servicio.nombre}</ThemedText>

        <ThemedText type="small" themeColor="textSecondary">
          {reserva.vehiculo.placa} · {reserva.vehiculo.marca} {reserva.vehiculo.modelo}
        </ThemedText>

        <View style={styles.pie}>
          <ThemedText type="small" themeColor="textSecondary">
            {formatearFecha(reserva.inicio)} · {formatearRangoHorario(reserva.inicio, reserva.fin)}
          </ThemedText>
          <ThemedText type="smallBold">{formatearDinero(reserva.monto)}</ThemedText>
        </View>
      </Card>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
