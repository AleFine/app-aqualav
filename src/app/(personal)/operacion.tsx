import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  View,
  type SectionListData,
} from 'react-native';

import { ConfirmarDialogo } from '@/components/confirmar-dialogo';
import { Cargando, VistaError, VistaVacia } from '@/components/estado-vista';
import { ReservaCard } from '@/components/reserva-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useCatalogoEstados } from '@/hooks/use-catalogo-estados';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/services/api-client';
import { listarReservas } from '@/services/reservas.service';
import type { EstadoReserva, Reserva } from '@/types/reserva';
import { etiquetaEstado } from '@/utils/estados';
import { aFechaIso, formatearFechaLarga } from '@/utils/formato';

/**
 * Staff work board (RF-019, RF-021, RF-024).
 *
 * One section per stage of the day: every state a service can still move away
 * from, as `GET /estados` reports them. Each section is a separate
 * `GET /reservas` filtered by state, kept to today's reservations because the
 * board is a today-only view of the shop.
 *
 * The stages used to be a three-item list in this file, which is why a
 * reservation in a state added to `transicion_estado` afterwards disappeared
 * from the board while its vehicle was still inside (principle P3).
 *
 * The `(personal)` group has no profile tab, so the sign-out lives here.
 */

type SeccionTablero = {
  estado: EstadoReserva;
  titulo: string;
  data: Reserva[];
};

type ModoCarga = 'inicial' | 'refresco';

/**
 * Column titles this build has better words for. Everything else falls back to
 * the derived label, so an unknown stage still gets a readable header.
 */
const TITULO_DE_ETAPA: Partial<Record<EstadoReserva, string>> = {
  confirmada: 'Por atender',
  finalizado: 'Por entregar',
};

function tituloDeEtapa(estado: EstadoReserva): string {
  return TITULO_DE_ETAPA[estado] ?? etiquetaEstado(estado);
}

/** Largest page the API accepts; a single day never fills it. */
const TAMANIO_PAGINA = 50;

function claveReserva(reserva: Reserva): string {
  return String(reserva.id);
}

/**
 * Reads every active stage in parallel and keeps the reservations that start
 * today (America/Lima, the timezone every business rule uses).
 */
async function cargarTablero(etapas: readonly EstadoReserva[]): Promise<SeccionTablero[]> {
  const hoy = aFechaIso(new Date());

  const paginas = await Promise.all(
    etapas.map((estado) => listarReservas({ estado, tamanio: TAMANIO_PAGINA }))
  );

  return etapas.map((estado, indice) => ({
    estado,
    titulo: tituloDeEtapa(estado),
    data: paginas[indice].items
      .filter((reserva) => aFechaIso(new Date(reserva.inicio)) === hoy)
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()),
  }));
}

export default function PersonalOperacionScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { cerrarSesion } = useAuth();
  const { activos } = useCatalogoEstados();
  const { toast, show, hide } = useToast();

  // Stable across renders while the catalogue does not move, so the focus
  // effect below re-reads on focus and not on every render.
  const etapas = useMemo(() => activos.map((estado) => estado.codigo), [activos]);

  const [secciones, setSecciones] = useState<SeccionTablero[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCargando, setIsCargando] = useState(true);
  const [isRefrescando, setIsRefrescando] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);

  // Tells the focus effect whether it is the first load (full screen spinner)
  // or a return from the detail screen (pull-to-refresh spinner).
  const yaCargado = useRef(false);

  const cargar = useCallback(
    async (modo: ModoCarga) => {
      if (modo === 'inicial') {
        setIsCargando(true);
      } else {
        setIsRefrescando(true);
      }

      try {
        const datos = await cargarTablero(etapas);
        setSecciones(datos);
        setError(null);
        yaCargado.current = true;
      } catch (causa) {
        const mensaje =
          causa instanceof ApiError ? causa.message : 'No se pudo cargar la operación del día';

        if (modo === 'inicial') {
          setError(mensaje);
        } else {
          // A failed refresh keeps the board that is already on screen.
          show(mensaje, 'error');
        }
      } finally {
        if (modo === 'inicial') {
          setIsCargando(false);
        } else {
          setIsRefrescando(false);
        }
      }
    },
    [etapas, show]
  );

  // Refetch on every focus: a check-in done in the detail screen moves a
  // reservation from one section to another.
  useFocusEffect(
    useCallback(() => {
      void cargar(yaCargado.current ? 'refresco' : 'inicial');
    }, [cargar])
  );

  const refrescar = useCallback(() => {
    void cargar('refresco');
  }, [cargar]);

  const reintentar = useCallback(() => {
    void cargar('inicial');
  }, [cargar]);

  const abrirReserva = useCallback(
    (id: number) => {
      router.push({ pathname: '/(personal)/reserva/[id]', params: { id } });
    },
    [router]
  );

  const confirmarCierreSesion = useCallback(() => {
    setConfirmarSalida(false);
    // The root layout swaps the navigator as soon as the session is gone.
    void cerrarSesion().catch(() => show('No se pudo cerrar la sesión', 'error'));
  }, [cerrarSesion, show]);

  const renderItem = useCallback(
    ({ item }: { item: Reserva }) => <ReservaCard reserva={item} onPress={abrirReserva} />,
    [abrirReserva]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<Reserva, SeccionTablero> }) => (
      <View style={[styles.cabeceraSeccion, { backgroundColor: theme.background }]}>
        <ThemedText type="smallBold">{section.titulo}</ThemedText>
        <Badge label={String(section.data.length)} tone="info" />
      </View>
    ),
    [theme.background]
  );

  const renderSectionFooter = useCallback(
    ({ section }: { section: SectionListData<Reserva, SeccionTablero> }) =>
      section.data.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.seccionVacia}>
          Sin reservas en esta etapa.
        </ThemedText>
      ) : null,
    []
  );

  const total = secciones?.reduce((suma, seccion) => suma + seccion.data.length, 0) ?? 0;

  let contenido: ReactNode;

  if (isCargando) {
    contenido = <Cargando mensaje="Cargando la operación del día…" />;
  } else if (error) {
    contenido = <VistaError mensaje={error} onReintentar={reintentar} />;
  } else if (!secciones || total === 0) {
    contenido = (
      <ScrollView
        contentContainerStyle={styles.vacio}
        refreshControl={
          <RefreshControl
            refreshing={isRefrescando}
            onRefresh={refrescar}
            tintColor={theme.tint}
            colors={[theme.tint]}
          />
        }>
        <VistaVacia
          titulo="Sin reservas para hoy"
          mensaje="Cuando un cliente reserve para hoy aparecerá aquí. Desliza hacia abajo para actualizar."
        />
      </ScrollView>
    );
  } else {
    contenido = (
      <SectionList
        sections={secciones}
        keyExtractor={claveReserva}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefrescando}
            onRefresh={refrescar}
            tintColor={theme.tint}
            colors={[theme.tint]}
          />
        }
      />
    );
  }

  return (
    <>
      <Screen style={styles.pantalla}>
        <View style={styles.encabezado}>
          <View style={styles.encabezadoTexto}>
            <ThemedText type="smallBold">Operación del día</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatearFechaLarga(new Date().toISOString())}
            </ThemedText>
          </View>

          <Button
            title="Cerrar sesión"
            variant="secondary"
            onPress={() => setConfirmarSalida(true)}
            style={styles.botonSalir}
          />
        </View>

        {contenido}
      </Screen>

      <ConfirmarDialogo
        visible={confirmarSalida}
        titulo="Cerrar sesión"
        mensaje="Se cerrará tu sesión en este dispositivo y volverás a la pantalla de acceso."
        textoConfirmar="Cerrar sesión"
        tono="peligro"
        onConfirmar={confirmarCierreSesion}
        onCancelar={() => setConfirmarSalida(false)}
      />

      <Toast message={toast?.message ?? null} tone={toast?.tone} onHide={hide} />
    </>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    paddingTop: Spacing.three,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  encabezadoTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  botonSalir: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
  },
  lista: {
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  cabeceraSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  seccionVacia: {
    paddingBottom: Spacing.three,
  },
  vacio: {
    flexGrow: 1,
  },
});
