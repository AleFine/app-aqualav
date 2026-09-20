import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The three branches every data screen renders before its content: loading,
 * error and empty. Keeping them here makes the branches look identical across
 * the app and keeps the screens short.
 */

type CargandoProps = {
  mensaje?: string;
};

export function Cargando({ mensaje = 'Cargando…' }: CargandoProps) {
  const theme = useTheme();

  return (
    <View style={styles.centro}>
      <ActivityIndicator color={theme.tint} />
      <ThemedText type="small" themeColor="textSecondary">
        {mensaje}
      </ThemedText>
    </View>
  );
}

type VistaErrorProps = {
  mensaje: string;
  onReintentar?: () => void;
};

export function VistaError({ mensaje, onReintentar }: VistaErrorProps) {
  const theme = useTheme();

  return (
    <View style={styles.centro}>
      <ThemedText type="smallBold" style={{ color: theme.danger }}>
        No se pudo cargar la información
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.texto}>
        {mensaje}
      </ThemedText>
      {onReintentar ? (
        <Button title="Reintentar" variant="secondary" onPress={onReintentar} />
      ) : null}
    </View>
  );
}

type VistaVaciaProps = {
  titulo: string;
  mensaje: string;
  /** Optional call to action, usually a `<Button />`. */
  accion?: ReactNode;
};

export function VistaVacia({ titulo, mensaje, accion }: VistaVaciaProps) {
  return (
    <View style={styles.centro}>
      <ThemedText type="smallBold">{titulo}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.texto}>
        {mensaje}
      </ThemedText>
      {accion}
    </View>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  texto: {
    textAlign: 'center',
  },
});
