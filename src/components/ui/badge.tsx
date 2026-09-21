/**
 * Pastilla pequenia para estados, categorias y contadores.
 *
 * La pastilla es un fondo tenido suave con el texto en el color fuerte del
 * mismo tono: se lee como una etiqueta solida y no como un boton vacio con
 * borde, que era el aspecto anterior y competia visualmente con los chips.
 *
 * `tone` cubre los casos comunes; `color` lo reemplaza cuando quien llama ya
 * resolvio un color del tema (ver `EstadoBadge`). `icon` es la segunda senial:
 * el color nunca debe ser la unica forma de distinguir un estado.
 */

import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type NombreIcono } from '@/components/ui/icon';
import { Radius, Spacing, conAlfa } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeTone = 'neutral' | 'info' | 'exito' | 'alerta' | 'peligro';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  /** Color resuelto que gana sobre `tone`. */
  color?: string;
  /** Icono decorativo delante del rotulo. El rotulo ya nombra el estado. */
  icon?: NombreIcono;
  style?: StyleProp<ViewStyle>;
};

export const Badge = memo(function Badge({
  label,
  tone = 'neutral',
  color,
  icon,
  style,
}: BadgeProps) {
  const theme = useTheme();

  /* Cada tono es un par: color fuerte para el texto, version suave para el fondo. */
  const parPorTono: Record<BadgeTone, { fuerte: string; suave: string }> = {
    neutral: { fuerte: theme.textSecondary, suave: theme.surfaceSunken },
    info: { fuerte: theme.info, suave: theme.infoSoft },
    exito: { fuerte: theme.success, suave: theme.successSoft },
    alerta: { fuerte: theme.warning, suave: theme.warningSoft },
    peligro: { fuerte: theme.danger, suave: theme.dangerSoft },
  };

  /* Con un color a medida el fondo se deriva del mismo color, no del tono. */
  const { fuerte, suave } = color
    ? { fuerte: color, suave: conAlfa(color, 0.14) }
    : parPorTono[tone];

  return (
    <View style={[styles.badge, { backgroundColor: suave }, style]}>
      {icon ? <Icon name={icon} size="xs" color={fuerte} /> : null}

      <ThemedText type="caption" style={{ color: fuerte }} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.full,
  },
});
