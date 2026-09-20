import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useRef, useState, type ReactNode } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ConfirmarDialogo } from '@/components/confirmar-dialogo';
import { Cargando, VistaError, VistaVacia } from '@/components/estado-vista';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/services/api-client';
import { actualizarServicio, listarServiciosAdmin } from '@/services/servicios.service';
import type { Servicio } from '@/types/servicio';
import { formatearDinero } from '@/utils/formato';

/**
 * RF-010: the administrator's catalog. Unlike the customer one it lists the
 * inactive services too, because activating and deactivating them is precisely
 * what this screen is for.
 *
 * The `(admin)` group has no profile screen, so the sign-out lives here.
 */

type ModoCarga = 'inicial' | 'refresco';

function claveServicio(servicio: Servicio): string {
  return String(servicio.id);
}

type FilaServicioProps = {
  servicio: Servicio;
  /** `false` hides the activate/deactivate button (permission gate). */
  puedeAdministrar: boolean;
  alternando: boolean;
  bloqueado: boolean;
  onAbrir: (id: number) => void;
  onAlternar: (servicio: Servicio) => void;
};

const FilaServicio = memo(function FilaServicio({
  servicio,
  puedeAdministrar,
  alternando,
  bloqueado,
  onAbrir,
  onAlternar,
}: FilaServicioProps) {
  const handleAbrir = useCallback(() => onAbrir(servicio.id), [onAbrir, servicio.id]);
  const handleAlternar = useCallback(() => onAlternar(servicio), [onAlternar, servicio]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Editar ${servicio.nombre}`}
      onPress={handleAbrir}
      style={({ pressed }) => (pressed ? styles.presionado : null)}>
      <Card>
        <View style={styles.filaEntreExtremos}>
          <ThemedText type="smallBold" style={styles.nombre}>
            {servicio.nombre}
          </ThemedText>
          <Badge
            label={servicio.activo ? 'Activo' : 'Inactivo'}
            tone={servicio.activo ? 'exito' : 'neutral'}
          />
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          {servicio.categoria} · {servicio.duracion_min} min
        </ThemedText>

        <View style={styles.filaEntreExtremos}>
          <ThemedText type="smallBold">{formatearDinero(servicio.precio)}</ThemedText>

          {puedeAdministrar ? (
            <Button
              title={servicio.activo ? 'Desactivar' : 'Activar'}
              variant="secondary"
              loading={alternando}
              disabled={bloqueado}
              onPress={handleAlternar}
              style={styles.botonFila}
            />
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
});

export default function AdminServiciosScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { cerrarSesion, tiene } = useAuth();
  const { toast, show, hide } = useToast();

  const [servicios, setServicios] = useState<Servicio[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCargando, setIsCargando] = useState(true);
  const [isRefrescando, setIsRefrescando] = useState(false);
  const [alternando, setAlternando] = useState<number | null>(null);
  const [porAlternar, setPorAlternar] = useState<Servicio | null>(null);
  const [confirmarSalida, setConfirmarSalida] = useState(false);

  const yaCargado = useRef(false);
  const puedeAdministrar = tiene('servicio:administrar');

  const cargar = useCallback(
    async (modo: ModoCarga) => {
      if (modo === 'inicial') {
        setIsCargando(true);
      } else {
        setIsRefrescando(true);
      }

      try {
        const datos = await listarServiciosAdmin();
        setServicios(datos);
        setError(null);
        yaCargado.current = true;
      } catch (causa) {
        const mensaje =
          causa instanceof ApiError ? causa.message : 'No se pudo cargar el catálogo';

        if (modo === 'inicial') {
          setError(mensaje);
        } else {
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
    [show]
  );

  // Refetch on focus: coming back from the form must show what was just saved.
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

  const abrirServicio = useCallback(
    (servicioId: number) => {
      router.push({ pathname: '/(admin)/servicio/[id]', params: { id: servicioId } });
    },
    [router]
  );

  const crearServicioNuevo = useCallback(() => {
    // `nuevo` is the sentinel the form reads to decide create vs. edit.
    router.push({ pathname: '/(admin)/servicio/[id]', params: { id: 'nuevo' } });
  }, [router]);

  const pedirConfirmacionAlternar = useCallback((servicio: Servicio) => {
    setPorAlternar(servicio);
  }, []);

  const cerrarConfirmacion = useCallback(() => setPorAlternar(null), []);

  const confirmarAlternar = useCallback(() => {
    const servicio = porAlternar;
    setPorAlternar(null);

    if (!servicio) {
      return;
    }

    setAlternando(servicio.id);

    void (async () => {
      try {
        await actualizarServicio(servicio.id, { activo: !servicio.activo });
        await cargar('refresco');
        show(servicio.activo ? 'Servicio desactivado.' : 'Servicio activado.');
      } catch (causa) {
        show(
          causa instanceof ApiError ? causa.message : 'No se pudo actualizar el servicio',
          'error'
        );
      } finally {
        setAlternando(null);
      }
    })();
  }, [cargar, porAlternar, show]);

  const confirmarCierreSesion = useCallback(() => {
    setConfirmarSalida(false);
    void cerrarSesion().catch(() => show('No se pudo cerrar la sesión', 'error'));
  }, [cerrarSesion, show]);

  const renderItem = useCallback(
    ({ item }: { item: Servicio }) => (
      <FilaServicio
        servicio={item}
        puedeAdministrar={puedeAdministrar}
        alternando={alternando === item.id}
        bloqueado={alternando !== null}
        onAbrir={abrirServicio}
        onAlternar={pedirConfirmacionAlternar}
      />
    ),
    [abrirServicio, alternando, pedirConfirmacionAlternar, puedeAdministrar]
  );

  let contenido: ReactNode;

  if (isCargando) {
    contenido = <Cargando mensaje="Cargando el catálogo…" />;
  } else if (error) {
    contenido = <VistaError mensaje={error} onReintentar={reintentar} />;
  } else if (!servicios || servicios.length === 0) {
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
          titulo="Todavía no hay servicios"
          mensaje="Crea el primer servicio con su precio y su duración para que aparezca en el catálogo del cliente."
          accion={
            puedeAdministrar ? (
              <Button title="Nuevo servicio" onPress={crearServicioNuevo} />
            ) : null
          }
        />
      </ScrollView>
    );
  } else {
    contenido = (
      <FlatList
        data={servicios}
        keyExtractor={claveServicio}
        renderItem={renderItem}
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
            <ThemedText type="smallBold">Catálogo de servicios</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Precios y duraciones vigentes
            </ThemedText>
          </View>

          <Button
            title="Cerrar sesión"
            variant="secondary"
            onPress={() => setConfirmarSalida(true)}
            style={styles.botonEncabezado}
          />
        </View>

        {puedeAdministrar ? (
          <Button
            title="Nuevo servicio"
            onPress={crearServicioNuevo}
            style={styles.botonNuevo}
          />
        ) : null}

        {contenido}
      </Screen>

      <ConfirmarDialogo
        visible={porAlternar !== null}
        titulo={porAlternar?.activo ? 'Desactivar el servicio' : 'Activar el servicio'}
        mensaje={
          porAlternar?.activo
            ? `«${porAlternar.nombre}» dejará de aparecer en el catálogo del cliente. Las reservas ya creadas no se ven afectadas.`
            : `«${porAlternar?.nombre ?? ''}» volverá a aparecer en el catálogo del cliente y podrá reservarse.`
        }
        textoConfirmar={porAlternar?.activo ? 'Desactivar' : 'Activar'}
        tono={porAlternar?.activo ? 'peligro' : 'neutral'}
        onConfirmar={confirmarAlternar}
        onCancelar={cerrarConfirmacion}
      />

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
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  encabezadoTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  botonEncabezado: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
  },
  botonNuevo: {
    borderRadius: Radius.md,
  },
  botonFila: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
  },
  lista: {
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  filaEntreExtremos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  nombre: {
    flex: 1,
  },
  presionado: {
    opacity: 0.7,
  },
  vacio: {
    flexGrow: 1,
  },
});
