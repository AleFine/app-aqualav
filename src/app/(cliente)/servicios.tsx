import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View, type ListRenderItemInfo } from 'react-native';

import { Cargando, VistaError, VistaVacia } from '@/components/estado-vista';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { listarServicios } from '@/services/servicios.service';
import type { Servicio } from '@/types/servicio';
import { formatearDinero } from '@/utils/formato';

/**
 * RF-009 — service catalog.
 *
 * `GET /servicios` already returns active services only (CA-01), so the screen
 * never filters by `activo`. The list is ordered by category and rendered as a
 * single `FlatList` whose rows are either a category header or a service, which
 * keeps one virtualized list instead of a list of lists.
 */

/** A category header or a service card, so both live in the same FlatList. */
type Fila =
  | { clave: string; tipo: 'categoria'; categoria: string }
  | { clave: string; tipo: 'servicio'; servicio: Servicio };

/** Stable key extractor: creating it per render would defeat virtualization. */
function claveFila(fila: Fila): string {
  return fila.clave;
}

/** `general` -> `General`. The API stores categories in lower case. */
function titularCategoria(categoria: string): string {
  return categoria.charAt(0).toUpperCase() + categoria.slice(1);
}

/** Sorts by category, then by name, and injects one header per category. */
function agruparPorCategoria(servicios: Servicio[]): Fila[] {
  const ordenados = [...servicios].sort(
    (a, b) =>
      a.categoria.localeCompare(b.categoria, 'es') || a.nombre.localeCompare(b.nombre, 'es')
  );

  const filas: Fila[] = [];
  let categoriaActual: string | null = null;

  ordenados.forEach((servicio) => {
    if (servicio.categoria !== categoriaActual) {
      categoriaActual = servicio.categoria;
      filas.push({
        clave: `categoria-${servicio.categoria}`,
        tipo: 'categoria',
        categoria: servicio.categoria,
      });
    }

    filas.push({ clave: `servicio-${servicio.id}`, tipo: 'servicio', servicio });
  });

  return filas;
}

type TarjetaServicioProps = {
  servicio: Servicio;
  onPress: (id: number) => void;
};

const TarjetaServicio = memo(function TarjetaServicio({
  servicio,
  onPress,
}: TarjetaServicioProps) {
  const handlePress = useCallback(() => onPress(servicio.id), [onPress, servicio.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Reservar ${servicio.nombre}`}
      onPress={handlePress}
      style={({ pressed }) => (pressed ? styles.presionado : null)}>
      <Card>
        <View style={styles.encabezadoTarjeta}>
          <ThemedText type="smallBold" style={styles.nombre}>
            {servicio.nombre}
          </ThemedText>
          <Badge label={`${servicio.duracion_min} min`} tone="info" />
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          {servicio.descripcion}
        </ThemedText>

        <View style={styles.pie}>
          <ThemedText type="smallBold">{formatearDinero(servicio.precio)}</ThemedText>
          {/* RN-12 / RF-009 CA-02: the stored price is final, IGV included. */}
          <ThemedText type="small" themeColor="textSecondary">
            IGV incluido
          </ThemedText>
        </View>
      </Card>
    </Pressable>
  );
});

export default function ClienteServiciosScreen() {
  const router = useRouter();
  // `listarServicios` lives at module scope, so the reference is already stable.
  const { data, error, isLoading, reload } = useAsync(listarServicios);

  const filas = useMemo(() => agruparPorCategoria(data ?? []), [data]);

  const abrirServicio = useCallback(
    (id: number) => router.push({ pathname: '/(cliente)/reservar/[servicioId]', params: { servicioId: id } }),
    [router]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Fila>) => {
      if (item.tipo === 'categoria') {
        return (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.categoria}>
            {titularCategoria(item.categoria).toUpperCase()}
          </ThemedText>
        );
      }

      return <TarjetaServicio servicio={item.servicio} onPress={abrirServicio} />;
    },
    [abrirServicio]
  );

  return (
    <Screen style={styles.pantalla}>
      <View style={styles.encabezado}>
        <ThemedText type="subtitle">Servicios</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Elige un servicio para reservar tu lavado.
        </ThemedText>
      </View>

      {isLoading ? (
        <Cargando mensaje="Cargando el catálogo…" />
      ) : error ? (
        // Flow 2a: no connection or a server error, with an explicit retry.
        <VistaError mensaje={error.message} onReintentar={reload} />
      ) : filas.length === 0 ? (
        // Flow 3a: the catalog has no active services yet.
        <VistaVacia
          titulo="Todavía no hay servicios"
          mensaje="El lavadero aún no publicó su catálogo. Vuelve a intentarlo más tarde."
        />
      ) : (
        <FlatList
          data={filas}
          keyExtractor={claveFila}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    paddingTop: Spacing.three,
  },
  encabezado: {
    gap: Spacing.one,
    paddingBottom: Spacing.three,
  },
  lista: {
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  categoria: {
    letterSpacing: 1,
    paddingTop: Spacing.two,
  },
  encabezadoTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  nombre: {
    flexShrink: 1,
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  presionado: {
    opacity: 0.7,
  },
});
