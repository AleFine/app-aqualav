import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { Cargando, VistaError, VistaVacia } from '@/components/estado-vista';
import { ReservaCard } from '@/components/reserva-card';
import { Screen } from '@/components/screen';
import { Selector, type OpcionSelector } from '@/components/selector';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useCatalogoEstados } from '@/hooks/use-catalogo-estados';
import { useTheme } from '@/hooks/use-theme';
import { listarReservas } from '@/services/reservas.service';
import type { EstadoReserva, Reserva } from '@/types/reserva';
import { etiquetaEstado } from '@/utils/estados';

/**
 * RF-017 — reservation history.
 *
 * The backend sorts by `inicio DESC` and pages by 20 (CA-01); this screen keeps
 * that page size, appends every page to the same list and splits the result in
 * "Próximas" and "Historial" against the clock, as the RF asks. Changing the
 * state filter starts again from page 1 (CA-02). A client only ever receives
 * its own rows, which is enforced server-side (CA-03).
 */

/** RF-017 CA-01: the history is paged by 20. */
const TAMANIO_PAGINA = 20;

/** The estado filter plus the "everything" option, which sends no parameter. */
type FiltroEstado = 'todas' | EstadoReserva;

/** "Todas" first, then every declared state in the order the API reports. */
const FILTRO_TODAS: OpcionSelector<FiltroEstado> = { valor: 'todas', etiqueta: 'Todas' };

/** The page the screen is asking the API for; `token` forces a re-read. */
type Consulta = {
  pagina: number;
  filtro: FiltroEstado;
  token: number;
};

/** A section header or a reservation, so both share one virtualized list. */
type Fila =
  | { clave: string; tipo: 'seccion'; titulo: string }
  | { clave: string; tipo: 'reserva'; reserva: Reserva };

function claveFila(fila: Fila): string {
  return fila.clave;
}

function aFilaReserva(reserva: Reserva): Fila {
  return { clave: `reserva-${reserva.id}`, tipo: 'reserva', reserva };
}

/** Splits the accumulated pages against `ahora`, keeping each half ordered. */
function construirFilas(reservas: Reserva[], ahora: number): Fila[] {
  const proximas = reservas
    .filter((reserva) => Date.parse(reserva.inicio) >= ahora)
    .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));

  // Already sorted `inicio DESC` by the API: the most recent one comes first.
  const historial = reservas.filter((reserva) => Date.parse(reserva.inicio) < ahora);

  const filas: Fila[] = [];

  if (proximas.length > 0) {
    filas.push({ clave: 'seccion-proximas', tipo: 'seccion', titulo: 'Próximas' });
    filas.push(...proximas.map(aFilaReserva));
  }

  if (historial.length > 0) {
    filas.push({ clave: 'seccion-historial', tipo: 'seccion', titulo: 'Historial' });
    filas.push(...historial.map(aFilaReserva));
  }

  return filas;
}

export default function ClienteReservasScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { estados } = useCatalogoEstados();

  // Built from `GET /estados`, so a state added to `transicion_estado` gets its
  // own chip with no code change (principle P3, RF-021 CA-03).
  const opcionesFiltro = useMemo<readonly OpcionSelector<FiltroEstado>[]>(
    () => [
      FILTRO_TODAS,
      ...estados.map((estado) => ({
        valor: estado.codigo as FiltroEstado,
        etiqueta: etiquetaEstado(estado.codigo),
      })),
    ],
    [estados]
  );

  /**
   * The request the effect has to run. Keeping it in one object means the
   * effect re-reads exactly when a new query is asked for, and never because
   * some unrelated piece of state moved.
   */
  const [consulta, setConsulta] = useState<Consulta>({
    pagina: 1,
    filtro: 'todas',
    token: 0,
  });

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [ahora, setAhora] = useState(() => Date.now());

  const [isCargando, setIsCargando] = useState(true);
  const [isCargandoMas, setIsCargandoMas] = useState(false);
  const [isRefrescando, setIsRefrescando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  const filtro = consulta.filtro;

  /**
   * The effect owns the request and writes state only from the promise
   * callbacks; whoever asks for a page turns its own indicator on before
   * changing `consulta`.
   */
  useEffect(() => {
    let cancelado = false;

    listarReservas({
      estado: consulta.filtro === 'todas' ? undefined : consulta.filtro,
      pagina: consulta.pagina,
      tamanio: TAMANIO_PAGINA,
    })
      .then((respuesta) => {
        if (cancelado) {
          return;
        }

        setReservas((previas) =>
          consulta.pagina === 1 ? respuesta.items : [...previas, ...respuesta.items]
        );
        setPagina(respuesta.pagina);
        setTotalPaginas(respuesta.total_paginas);
        setAhora(Date.now());
        setErrorMensaje(null);
      })
      .catch((error: unknown) => {
        if (!cancelado) {
          setErrorMensaje(
            error instanceof Error ? error.message : 'No se pudieron cargar tus reservas'
          );
        }
      })
      .finally(() => {
        if (!cancelado) {
          setIsCargando(false);
          setIsCargandoMas(false);
          setIsRefrescando(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [consulta]);

  const filas = useMemo(() => construirFilas(reservas, ahora), [ahora, reservas]);

  const hayMasPaginas = pagina < totalPaginas;

  /**
   * A different filter is a different query (CA-02): the accumulated pages are
   * dropped and the history starts again at page 1.
   */
  const cambiarFiltro = useCallback(
    (nuevo: FiltroEstado) => {
      if (nuevo === filtro) {
        return;
      }

      setReservas([]);
      setPagina(1);
      setTotalPaginas(1);
      setErrorMensaje(null);
      setIsCargando(true);
      setConsulta((previa) => ({ pagina: 1, filtro: nuevo, token: previa.token + 1 }));
    },
    [filtro]
  );

  const cargarMas = useCallback(() => {
    if (isCargando || isCargandoMas || isRefrescando || !hayMasPaginas) {
      return;
    }

    setIsCargandoMas(true);
    setConsulta((previa) => ({ ...previa, pagina: pagina + 1, token: previa.token + 1 }));
  }, [hayMasPaginas, isCargando, isCargandoMas, isRefrescando, pagina]);

  const refrescar = useCallback(() => {
    setIsRefrescando(true);
    setConsulta((previa) => ({ ...previa, pagina: 1, token: previa.token + 1 }));
  }, []);

  const reintentar = useCallback(() => {
    setIsCargando(true);
    setErrorMensaje(null);
    setConsulta((previa) => ({ ...previa, pagina: 1, token: previa.token + 1 }));
  }, []);

  const abrirReserva = useCallback(
    (id: number) => router.push({ pathname: '/(cliente)/reservas/[id]', params: { id } }),
    [router]
  );

  const irAServicios = useCallback(() => router.navigate('/(cliente)/servicios'), [router]);

  const volver = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.navigate('/(cliente)/inicio');
  }, [router]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Fila>) => {
      if (item.tipo === 'seccion') {
        return (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.seccion}>
            {item.titulo.toUpperCase()}
          </ThemedText>
        );
      }

      return <ReservaCard reserva={item.reserva} onPress={abrirReserva} />;
    },
    [abrirReserva]
  );

  return (
    <Screen style={styles.pantalla}>
      <View style={styles.encabezado}>
        {/* The tab bar stays visible on this route, so it renders its own back. */}
        <Pressable
          accessibilityRole="button"
          hitSlop={Spacing.two}
          onPress={volver}
          style={({ pressed }) => [styles.volver, pressed ? styles.presionado : null]}>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>
            ← Volver
          </ThemedText>
        </Pressable>

        <ThemedText type="subtitle">Mis reservas</ThemedText>

        <Selector
          label="Estado"
          opciones={opcionesFiltro}
          valor={filtro}
          onChange={cambiarFiltro}
        />
      </View>

      {isCargando ? (
        <Cargando mensaje="Cargando tu historial…" />
      ) : errorMensaje && reservas.length === 0 ? (
        <VistaError mensaje={errorMensaje} onReintentar={reintentar} />
      ) : (
        <FlatList
          data={filas}
          keyExtractor={claveFila}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefrescando}
              onRefresh={refrescar}
              tintColor={theme.tint}
              colors={[theme.tint]}
            />
          }
          ListEmptyComponent={
            // Flow 2a: no reservations yet, with a direct way to book one.
            <VistaVacia
              titulo={
                filtro === 'todas' ? 'Aún no tienes reservas' : 'No hay reservas con ese estado'
              }
              mensaje={
                filtro === 'todas'
                  ? 'Cuando reserves un lavado lo verás aquí, junto con su historial.'
                  : 'Prueba con otro estado o quita el filtro para ver todas tus reservas.'
              }
              accion={
                filtro === 'todas' ? (
                  <Button title="Reservar un lavado" variant="secondary" onPress={irAServicios} />
                ) : undefined
              }
            />
          }
          ListFooterComponent={
            filas.length > 0 && hayMasPaginas ? (
              <View style={styles.pie}>
                {isCargandoMas ? (
                  <ActivityIndicator color={theme.tint} />
                ) : (
                  <Button title="Cargar más" variant="secondary" onPress={cargarMas} />
                )}
              </View>
            ) : null
          }
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
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  volver: {
    alignSelf: 'flex-start',
  },
  lista: {
    flexGrow: 1,
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  seccion: {
    letterSpacing: 1,
    paddingTop: Spacing.two,
  },
  pie: {
    paddingTop: Spacing.three,
    alignItems: 'center',
  },
  presionado: {
    opacity: 0.6,
  },
});
