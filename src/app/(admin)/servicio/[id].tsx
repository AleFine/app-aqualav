import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type TextInput } from 'react-native';

import { ConfirmarDialogo } from '@/components/confirmar-dialogo';
import { Cargando, VistaError } from '@/components/estado-vista';
import { Screen } from '@/components/screen';
import { Selector, type OpcionSelector } from '@/components/selector';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/services/api-client';
import {
  actualizarServicio,
  crearServicio,
  listarServiciosAdmin,
  obtenerServicio,
} from '@/services/servicios.service';
import type { Servicio } from '@/types/servicio';
import { formatearDinero } from '@/utils/formato';
import { validarRequerido } from '@/utils/validation';

/**
 * RF-010: create and edit a service. `id === 'nuevo'` is the create sentinel;
 * any other value edits that service.
 *
 * The price is typed in soles and converted to integer cents before the
 * request: money never travels as a float (contract §0). The duration is
 * picked from a closed list of multiples of 15 minutes, so the rule the
 * backend revalidates cannot be broken by hand (flow 4, CA-01).
 */

const ID_NUEVO = 'nuevo';
const MONEDA = 'PEN';

const NOMBRE_MAX_LENGTH = 80;
const DESCRIPCION_MAX_LENGTH = 400;
const CATEGORIA_MAX_LENGTH = 40;

/** Multiples of 15 minutes, the only durations the backend accepts. */
const DURACIONES: readonly OpcionSelector<string>[] = [15, 30, 45, 60, 90, 120].map(
  (minutos) => ({ valor: String(minutos), etiqueta: `${minutos} min` })
);

const CATEGORIA_PREDETERMINADA = 'general';

/** `"25.00"` (or `"25,00"`) -> `2500`. */
function aCentimos(valor: string): number | null {
  const limpio = valor.trim().replace(',', '.');

  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) {
    return null;
  }

  return Math.round(Number(limpio) * 100);
}

/** `2500` -> `"25.00"`, the shape the price field expects. */
function aSoles(centimos: number): string {
  return (centimos / 100).toFixed(2);
}

/**
 * `GET /servicios/{id}` only answers for active services (RF-010 CA-03), and
 * this form has to edit the deactivated ones too, so a 404 falls back to the
 * administration catalog, which lists them all.
 */
async function obtenerServicioAdministrado(servicioId: number): Promise<Servicio> {
  try {
    return await obtenerServicio(servicioId);
  } catch (causa) {
    if (!(causa instanceof ApiError) || causa.status !== 404) {
      throw causa;
    }

    const servicios = await listarServiciosAdmin();
    const encontrado = servicios.find((servicio) => servicio.id === servicioId);

    if (!encontrado) {
      throw causa;
    }

    return encontrado;
  }
}

export default function AdminServicioFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { toast, show, hide } = useToast();

  const esNuevo = id === ID_NUEVO;
  const servicioId = Number(id);

  const [original, setOriginal] = useState<Servicio | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [isCargando, setIsCargando] = useState(!esNuevo);
  const [isGuardando, setIsGuardando] = useState(false);
  const [confirmarPrecio, setConfirmarPrecio] = useState(false);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIA_PREDETERMINADA);
  const [duracion, setDuracion] = useState<string | null>(null);
  const [precio, setPrecio] = useState('');

  const [nombreError, setNombreError] = useState<string | null>(null);
  const [descripcionError, setDescripcionError] = useState<string | null>(null);
  const [categoriaError, setCategoriaError] = useState<string | null>(null);
  const [duracionError, setDuracionError] = useState<string | null>(null);
  const [precioError, setPrecioError] = useState<string | null>(null);

  const nombreRef = useRef<TextInput>(null);
  const descripcionRef = useRef<TextInput>(null);
  const categoriaRef = useRef<TextInput>(null);
  const precioRef = useRef<TextInput>(null);

  const cargar = useCallback(async () => {
    if (esNuevo) {
      return;
    }

    setIsCargando(true);

    try {
      const servicio = await obtenerServicioAdministrado(servicioId);
      setOriginal(servicio);
      setNombre(servicio.nombre);
      setDescripcion(servicio.descripcion);
      setCategoria(servicio.categoria);
      setDuracion(String(servicio.duracion_min));
      setPrecio(aSoles(servicio.precio.monto_centimos));
      setErrorCarga(null);
    } catch (causa) {
      setErrorCarga(causa instanceof ApiError ? causa.message : 'No se pudo cargar el servicio');
    } finally {
      setIsCargando(false);
    }
  }, [esNuevo, servicioId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const reintentar = useCallback(() => {
    void cargar();
  }, [cargar]);

  const volver = useCallback(() => router.back(), [router]);

  const escribirNombre = useCallback((valor: string) => {
    setNombre(valor);
    setNombreError(null);
  }, []);

  const escribirDescripcion = useCallback((valor: string) => {
    setDescripcion(valor);
    setDescripcionError(null);
  }, []);

  const escribirCategoria = useCallback((valor: string) => {
    setCategoria(valor);
    setCategoriaError(null);
  }, []);

  const elegirDuracion = useCallback((valor: string) => {
    setDuracion(valor);
    setDuracionError(null);
  }, []);

  const escribirPrecio = useCallback((valor: string) => {
    setPrecio(valor);
    setPrecioError(null);
  }, []);

  const guardar = useCallback(async () => {
    const centimos = aCentimos(precio);

    if (centimos === null || !duracion) {
      return;
    }

    setIsGuardando(true);

    try {
      if (esNuevo) {
        await crearServicio({
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          categoria: categoria.trim(),
          duracion_min: Number(duracion),
          monto_centimos: centimos,
          moneda: MONEDA,
        });
      } else {
        // The backend ignores an unchanged amount; a new one closes the current
        // price period and opens another (P6), so old reservations keep theirs.
        await actualizarServicio(servicioId, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          categoria: categoria.trim(),
          duracion_min: Number(duracion),
          monto_centimos: centimos,
          moneda: MONEDA,
        });
      }

      // The catalog refetches when it regains focus, so it shows the change.
      router.back();
    } catch (causa) {
      setIsGuardando(false);

      if (causa instanceof ApiError) {
        // Field errors belong on the field; everything typed stays (RNF-009 M4).
        const porCampo = [
          ['nombre', setNombreError],
          ['descripcion', setDescripcionError],
          ['categoria', setCategoriaError],
          ['duracion_min', setDuracionError],
          ['monto_centimos', setPrecioError],
        ] as const;

        let mapeado = false;
        porCampo.forEach(([campo, asignar]) => {
          const detalle = causa.detalleDe(campo);
          if (detalle) {
            asignar(detalle);
            mapeado = true;
          }
        });

        if (!mapeado) {
          show(causa.message, 'error');
        }
        return;
      }

      show('No se pudo guardar el servicio', 'error');
    }
  }, [
    categoria,
    descripcion,
    duracion,
    esNuevo,
    nombre,
    precio,
    router,
    servicioId,
    show,
  ]);

  const handleGuardar = useCallback(() => {
    // Client-side rules mirroring the backend (RNF-009 M1). Everything is
    // validated before focusing the first field that failed.
    const proximoNombre =
      validarRequerido(nombre, 'El nombre') ??
      (nombre.trim().length > NOMBRE_MAX_LENGTH
        ? `El nombre no puede superar ${NOMBRE_MAX_LENGTH} caracteres`
        : null);

    const proximaDescripcion =
      validarRequerido(descripcion, 'La descripción') ??
      (descripcion.trim().length > DESCRIPCION_MAX_LENGTH
        ? `La descripción no puede superar ${DESCRIPCION_MAX_LENGTH} caracteres`
        : null);

    const proximaCategoria =
      validarRequerido(categoria, 'La categoría') ??
      (categoria.trim().length > CATEGORIA_MAX_LENGTH
        ? `La categoría no puede superar ${CATEGORIA_MAX_LENGTH} caracteres`
        : null);

    const proximaDuracion = duracion ? null : 'Elige la duración estimada del servicio';

    const centimos = aCentimos(precio);
    let proximoPrecio: string | null = null;
    if (centimos === null) {
      proximoPrecio = 'Ingresa el precio en soles, por ejemplo 25.00';
    } else if (centimos <= 0) {
      proximoPrecio = 'El precio debe ser mayor que cero';
    }

    setNombreError(proximoNombre);
    setDescripcionError(proximaDescripcion);
    setCategoriaError(proximaCategoria);
    setDuracionError(proximaDuracion);
    setPrecioError(proximoPrecio);

    if (proximoNombre) {
      nombreRef.current?.focus();
      return;
    }
    if (proximaDescripcion) {
      descripcionRef.current?.focus();
      return;
    }
    if (proximaCategoria) {
      categoriaRef.current?.focus();
      return;
    }
    if (proximaDuracion) {
      return;
    }
    if (proximoPrecio) {
      precioRef.current?.focus();
      return;
    }

    // RF-010 flow 5a / CA-02: a new price only applies to reservations created
    // after the change, so the administrator confirms it explicitly.
    if (original && centimos !== original.precio.monto_centimos) {
      setConfirmarPrecio(true);
      return;
    }

    void guardar();
  }, [categoria, descripcion, duracion, guardar, nombre, original, precio]);

  const confirmarCambioPrecio = useCallback(() => {
    setConfirmarPrecio(false);
    void guardar();
  }, [guardar]);

  let contenido: ReactNode;

  if (isCargando) {
    contenido = <Cargando mensaje="Cargando el servicio…" />;
  } else if (errorCarga) {
    contenido = <VistaError mensaje={errorCarga} onReintentar={reintentar} />;
  } else {
    contenido = (
      <ScrollView
        contentContainerStyle={styles.formulario}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Card>
          <TextField
            ref={nombreRef}
            label="Nombre"
            value={nombre}
            onChangeText={escribirNombre}
            error={nombreError}
            maxLength={NOMBRE_MAX_LENGTH}
            counter
            returnKeyType="next"
            onSubmitEditing={() => descripcionRef.current?.focus()}
          />

          <TextField
            ref={descripcionRef}
            label="Descripción"
            value={descripcion}
            onChangeText={escribirDescripcion}
            error={descripcionError}
            maxLength={DESCRIPCION_MAX_LENGTH}
            counter
            multiline
            numberOfLines={3}
            returnKeyType="next"
          />

          <TextField
            ref={categoriaRef}
            label="Categoría"
            value={categoria}
            onChangeText={escribirCategoria}
            error={categoriaError}
            helper="Agrupa el servicio en el catálogo del cliente"
            maxLength={CATEGORIA_MAX_LENGTH}
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => precioRef.current?.focus()}
          />

          <Selector<string>
            label="Duración estimada"
            opciones={DURACIONES}
            valor={duracion}
            onChange={elegirDuracion}
            error={duracionError}
          />

          <TextField
            ref={precioRef}
            label="Precio (S/)"
            value={precio}
            onChangeText={escribirPrecio}
            error={precioError}
            helper={
              esNuevo
                ? 'IGV incluido. El monto se guarda en céntimos.'
                : 'Un precio nuevo solo se aplica a las reservas creadas después del cambio.'
            }
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={handleGuardar}
          />
        </Card>

        {original ? (
          <ThemedText type="small" themeColor="textSecondary">
            Precio vigente: {formatearDinero(original.precio)}
          </ThemedText>
        ) : null}

        <Button
          title={esNuevo ? 'Crear servicio' : 'Guardar cambios'}
          loading={isGuardando}
          onPress={handleGuardar}
          style={styles.guardar}
        />
      </ScrollView>
    );
  }

  return (
    <>
      <Screen style={styles.pantalla}>
        <View style={styles.encabezado}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={Spacing.two}
            onPress={volver}
            style={({ pressed }) => (pressed ? styles.presionado : null)}>
            <ThemedText type="smallBold" style={{ color: theme.tint }}>
              ‹ Volver
            </ThemedText>
          </Pressable>

          <ThemedText type="small" themeColor="textSecondary">
            {esNuevo ? 'Nuevo servicio' : 'Editar servicio'}
          </ThemedText>
        </View>

        {contenido}
      </Screen>

      <ConfirmarDialogo
        visible={confirmarPrecio}
        titulo="Cambiar el precio"
        mensaje="El precio nuevo solo se aplicará a las reservas creadas a partir de ahora. Las reservas ya existentes conservan la tarifa con la que se crearon."
        textoConfirmar="Guardar precio"
        onConfirmar={confirmarCambioPrecio}
        onCancelar={() => setConfirmarPrecio(false)}
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
  formulario: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  guardar: {
    borderRadius: Radius.lg,
  },
  presionado: {
    opacity: 0.6,
  },
});
