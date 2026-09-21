/**
 * Las tres ramas que toda pantalla de datos dibuja antes de su contenido:
 * cargando, error y vacio. Tenerlas aqui hace que se vean identicas en toda la
 * app y mantiene cortas las pantallas.
 *
 * Las tres comparten la misma figura: un disco tenido con un simbolo grande, un
 * titulo y una explicacion breve de ancho limitado. Un estado vacio sin imagen
 * se lee como un error; el disco es lo que lo convierte en un mensaje.
 */

import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Diametro del disco que contiene el simbolo. */
const DISCO = 88;

/** Ancho maximo del mensaje: mas alla de esto la linea deja de ser comoda. */
const ANCHO_MENSAJE = 320;

type CargandoProps = {
  mensaje?: string;
};

export function Cargando({ mensaje = 'Cargando…' }: CargandoProps) {
  const theme = useTheme();

  return (
    <View style={styles.centro}>
      <View style={[styles.disco, { backgroundColor: theme.brandSoft }]}>
        <ActivityIndicator color={theme.brand} size="large" />
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.texto}>
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
      <View style={[styles.disco, { backgroundColor: theme.dangerSoft }]}>
        <Icon name="error" size="xl" tone="danger" />
      </View>

      <ThemedText type="heading" themeColor="danger" style={styles.texto}>
        No se pudo cargar la información
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.texto}>
        {mensaje}
      </ThemedText>

      {onReintentar ? (
        <Button title="Reintentar" variant="secondary" icon="recargar" onPress={onReintentar} />
      ) : null}
    </View>
  );
}

type VistaVaciaProps = {
  titulo: string;
  mensaje: string;
  /** Llamada a la accion opcional, normalmente un `<Button />`. */
  accion?: ReactNode;
};

export function VistaVacia({ titulo, mensaje, accion }: VistaVaciaProps) {
  const theme = useTheme();

  return (
    <View style={styles.centro}>
      <View style={[styles.disco, { backgroundColor: theme.brandSoft }]}>
        <Icon name="vacio" size="xl" tone="brand" />
      </View>

      <ThemedText type="heading" style={styles.texto}>
        {titulo}
      </ThemedText>
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
  disco: {
    width: DISCO,
    height: DISCO,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  texto: {
    maxWidth: ANCHO_MENSAJE,
    textAlign: 'center',
  },
});
