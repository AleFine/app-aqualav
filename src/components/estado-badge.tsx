/**
 * Pastilla con el estado de una reserva: etiqueta en espaniol, color semantico
 * e icono. El icono importa tanto como el color: dos estados vecinos de la
 * misma familia cromatica se distinguen por el glifo, no por el matiz.
 */

import { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/hooks/use-theme';
import type { EstadoReserva } from '@/types/reserva';
import { COLOR_ESTADO, ICONO_ESTADO, etiquetaEstado } from '@/utils/estados';

type EstadoBadgeProps = {
  estado: EstadoReserva;
  style?: StyleProp<ViewStyle>;
};

export const EstadoBadge = memo(function EstadoBadge({ estado, style }: EstadoBadgeProps) {
  const theme = useTheme();

  return (
    <Badge
      label={etiquetaEstado(estado)}
      icon={ICONO_ESTADO(estado)}
      color={COLOR_ESTADO(estado, theme)}
      style={style}
    />
  );
});
