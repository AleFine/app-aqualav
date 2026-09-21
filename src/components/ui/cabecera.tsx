/**
 * Cabecera de pantalla.
 *
 * Antes cada pantalla dibujaba su propia fila de titulo y repetia un boton
 * "← Volver" escrito con una flecha tipografica. Eso rompia dos reglas a la
 * vez: la flecha no es un icono real (depende de la fuente del sistema) y el
 * area tactil quedaba por debajo de los 44 pt.
 *
 * Aqui el retroceso es un icono de la familia unica, con area tactil completa y
 * etiqueta accesible, y el titulo sale siempre de la misma escala.
 */

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { HitSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { toque } from '@/utils/haptica';

export type CabeceraProps = {
  titulo: string;
  subtitulo?: string;
  /** Muestra el boton de retroceso y define su accion. */
  onBack?: () => void;
  /** Control alineado a la derecha: filtro, ajustes, cerrar sesion. */
  accion?: ReactNode;
  /** Sobre un fondo degradado el texto cambia de color. */
  sobreDegradado?: boolean;
};

export function Cabecera({
  titulo,
  subtitulo,
  onBack,
  accion,
  sobreDegradado = false,
}: CabeceraProps) {
  const theme = useTheme();

  const colorTitulo = sobreDegradado ? theme.onGradient : theme.text;
  const colorSubtitulo = sobreDegradado ? theme.onGradientMuted : theme.textSecondary;

  return (
    <View style={styles.raiz}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => {
            toque();
            onBack();
          }}
          style={({ pressed }) => [
            styles.botonAtras,
            { backgroundColor: theme.surfaceSunken, borderColor: theme.border },
            pressed && styles.presionado,
          ]}
        >
          <Icon name="atras" size="md" tone={sobreDegradado ? 'onGradient' : 'text'} />
        </Pressable>
      ) : null}

      <View style={styles.textos}>
        <ThemedText type="title" style={{ color: colorTitulo }} numberOfLines={2}>
          {titulo}
        </ThemedText>
        {subtitulo ? (
          <ThemedText type="small" style={{ color: colorSubtitulo }} numberOfLines={2}>
            {subtitulo}
          </ThemedText>
        ) : null}
      </View>

      {accion ? <View style={styles.accion}>{accion}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.gutter,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  botonAtras: {
    width: HitSize.min,
    height: HitSize.min,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    /* Alinea el circulo con la primera linea del titulo. */
    marginTop: Spacing.half,
  },
  presionado: {
    opacity: 0.6,
  },
  textos: {
    flex: 1,
    gap: Spacing.one,
  },
  accion: {
    justifyContent: 'center',
    minHeight: HitSize.min,
  },
});
