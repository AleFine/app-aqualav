import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Cargando, VistaError, VistaVacia } from '@/components/estado-vista';
import { ReservaCard } from '@/components/reserva-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { HitSize, Radius, Spacing, conAlfa, elevacion } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useCatalogoEstados } from '@/hooks/use-catalogo-estados';
import { useTheme } from '@/hooks/use-theme';
import { listarReservas } from '@/services/reservas.service';
import type { EstadoReserva, Reserva } from '@/types/reserva';

/**
 * Client home: the reservations that still need the user's attention plus the
 * shortcut that starts a booking.
 *
 * "Upcoming" means EVERY non-terminal state, read from `GET /estados` rather
 * than listed here: a service in a state added to `transicion_estado` after
 * this build shipped is still a service the customer is waiting for
 * (principle P3, RF-021 CA-03). The API has no combined filter, so one page
 * per active state is requested and the results are merged.
 */

/** How many upcoming reservations the home shows before deferring to RF-017. */
const MAXIMO_PROXIMAS = 5;

/** `inicial` paints the spinner, `refresco` the pull-to-refresh control and
 * `silencioso` leaves the current content in place while it re-reads. */
type ModoCarga = 'inicial' | 'refresco' | 'silencioso';

function claveReserva(reserva: Reserva): string {
  return String(reserva.id);
}

export default function ClienteInicioScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { usuario } = useAuth();
  const { activos } = useCatalogoEstados();

  const estadosActivos = useMemo<EstadoReserva[]>(
    () => activos.map((estado) => estado.codigo),
    [activos]
  );

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [isCargando, setIsCargando] = useState(true);
  const [isRefrescando, setIsRefrescando] = useState(false);

  /** The first focus is the initial load; the following ones only re-read. */
  const esPrimeraCarga = useRef(true);

  const cargar = useCallback(
    async (modo: ModoCarga) => {
      if (modo === 'inicial') {
        setIsCargando(true);
      }
      if (modo === 'refresco') {
        setIsRefrescando(true);
      }

      try {
        const paginas = await Promise.all(
          estadosActivos.map((estado) => listarReservas({ estado }))
        );

        const ahora = Date.now();
        const proximas = paginas
          .flatMap((pagina) => pagina.items)
          // A service already under way is always relevant, whatever stage it is
          // in; one that has not started is only upcoming while its window is
          // still open. "Under way" is the entry time, a fact the API records,
          // not a state name this screen would have to keep up to date.
          .filter((reserva) => reserva.hora_ingreso !== null || Date.parse(reserva.fin) >= ahora)
          .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))
          .slice(0, MAXIMO_PROXIMAS);

        setReservas(proximas);
        setErrorMensaje(null);
      } catch (error) {
        setErrorMensaje(
          error instanceof Error ? error.message : 'No se pudieron cargar tus reservas'
        );
      } finally {
        setIsCargando(false);
        setIsRefrescando(false);
      }
    },
    [estadosActivos]
  );

  // Coming back from the booking wizard or from a cancellation must show the
  // updated list, so the screen re-reads every time it regains focus.
  useFocusEffect(
    useCallback(() => {
      void cargar(esPrimeraCarga.current ? 'inicial' : 'silencioso');
      esPrimeraCarga.current = false;
    }, [cargar])
  );

  const refrescar = useCallback(() => {
    void cargar('refresco');
  }, [cargar]);

  const reintentar = useCallback(() => {
    void cargar('inicial');
  }, [cargar]);

  const abrirReserva = useCallback(
    (id: number) => router.push({ pathname: '/(cliente)/reservas/[id]', params: { id } }),
    [router]
  );

  const irAServicios = useCallback(() => router.navigate('/(cliente)/servicios'), [router]);

  const irAHistorial = useCallback(() => router.push('/(cliente)/reservas'), [router]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Reserva>) => (
      <ReservaCard reserva={item} onPress={abrirReserva} />
    ),
    [abrirReserva]
  );

  const encabezado = (
    <View style={styles.encabezado}>
      {/*
       * Héroe: la única superficie de marca dentro de la app. Concentra el
       * saludo y la acción primaria para que la pantalla tenga un solo punto
       * de entrada evidente, como piden Material y la guía de Apple.
       */}
      <LinearGradient
        colors={[theme.gradientStart, theme.gradientMid, theme.gradientEnd]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        locations={[0, 0.55, 1]}
        style={[styles.heroe, elevacion(2, theme.shadow)]}
      >
        <View style={styles.marca}>
          <View
            style={[
              styles.sello,
              {
                backgroundColor: conAlfa(theme.onGradient, 0.14),
                borderColor: conAlfa(theme.onGradient, 0.22),
              },
            ]}
          >
            <Icon name="inicio" size="md" color={theme.onGradient} />
          </View>
          <ThemedText type="overline" style={{ color: theme.onGradientMuted }}>
            AquaLav
          </ThemedText>
        </View>

        <View style={styles.saludo}>
          <ThemedText type="title" style={{ color: theme.onGradient }} numberOfLines={2}>
            Hola, {usuario?.nombres ?? 'bienvenido'}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.onGradientMuted }}>
            Reserva tu lavado y sigue el avance de tu servicio desde aquí.
          </ThemedText>
        </View>

        {/* Sobre el degradado la acción primaria se invierte: superficie clara. */}
        <Button
          title="Reservar un lavado"
          icon="adelante"
          iconPosition="derecha"
          variant="contraste"
          onPress={irAServicios}
          fullWidth
          style={styles.cta}
        />
      </LinearGradient>

      <View style={styles.tituloSeccion}>
        <ThemedText type="heading">Próximas reservas</ThemedText>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Ver todas las reservas"
          onPress={irAHistorial}
          style={({ pressed }) => [styles.enlace, pressed && styles.presionado]}
        >
          <ThemedText type="labelStrong" themeColor="brand">
            Ver todas
          </ThemedText>
          <Icon name="adelante" size="sm" tone="brand" />
        </Pressable>
      </View>
    </View>
  );

  if (isCargando) {
    return (
      <Screen style={styles.pantalla}>
        <Cargando mensaje="Cargando tus reservas…" />
      </Screen>
    );
  }

  if (errorMensaje && reservas.length === 0) {
    return (
      <Screen style={styles.pantalla}>
        <VistaError mensaje={errorMensaje} onReintentar={reintentar} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.pantalla}>
      <FlatList
        data={reservas}
        keyExtractor={claveReserva}
        renderItem={renderItem}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={
          <VistaVacia
            titulo="Aún no tienes reservas"
            mensaje="Elige un servicio del catálogo y reserva tu próximo lavado en menos de un minuto."
            accion={<Button title="Ver servicios" variant="secondary" onPress={irAServicios} />}
          />
        }
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    paddingTop: Spacing.three,
  },
  lista: {
    flexGrow: 1,
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  encabezado: {
    paddingBottom: Spacing.two,
  },
  heroe: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.four,
    overflow: 'hidden',
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sello: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saludo: {
    gap: Spacing.two,
  },
  cta: {
    borderRadius: Radius.lg,
  },
  tituloSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.two,
  },
  enlace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    /* Area tactil completa sin desplazar el texto de su linea base. */
    minHeight: HitSize.min,
    paddingLeft: Spacing.two,
  },
  presionado: {
    opacity: 0.6,
  },
});
