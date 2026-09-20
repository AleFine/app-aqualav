import { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/hooks/use-theme';
import type { EstadoReserva } from '@/types/reserva';
import { COLOR_ESTADO, etiquetaEstado } from '@/utils/estados';

/** Pill showing the state of a reservation with its Spanish label and color. */

type EstadoBadgeProps = {
  estado: EstadoReserva;
  style?: StyleProp<ViewStyle>;
};

export const EstadoBadge = memo(function EstadoBadge({ estado, style }: EstadoBadgeProps) {
  const theme = useTheme();

  return (
    <Badge
      label={etiquetaEstado(estado)}
      color={COLOR_ESTADO(estado, theme)}
      style={style}
    />
  );
});
