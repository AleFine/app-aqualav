import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ListRenderItemInfo,
  type TextInput,
} from 'react-native';

import { Cargando, VistaError, VistaVacia } from '@/components/estado-vista';
import { Screen } from '@/components/screen';
import { Selector, type OpcionSelector } from '@/components/selector';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/services/api-client';
import { crearVehiculo, listarVehiculos } from '@/services/vehiculos.service';
import type { TipoVehiculo, Vehiculo } from '@/types/vehiculo';
import { ETIQUETA_TIPO_VEHICULO } from '@/utils/estados';
import {
  PLACA_MAX_LENGTH,
  normalizarPlaca,
  validarAnio,
  validarPlaca,
  validarRequerido,
} from '@/utils/validation';

/**
 * RF-007 — the client's vehicles plus the form that registers a new one.
 *
 * The form lives in a bottom-sheet `Modal` instead of the list header: a header
 * rendered by `FlatList` is rebuilt on every keystroke, which makes the inputs
 * lose focus. The plate is validated with the same rule the backend applies
 * (RNF-009 M1) and nothing the user typed is cleared when it fails (M4).
 */

/** Tipo catalog of RF-007 flow step 2, in the order the SRS names it. */
const OPCIONES_TIPO: readonly OpcionSelector<TipoVehiculo>[] = [
  { valor: 'sedan', etiqueta: ETIQUETA_TIPO_VEHICULO.sedan },
  { valor: 'suv', etiqueta: ETIQUETA_TIPO_VEHICULO.suv },
  { valor: 'camioneta', etiqueta: ETIQUETA_TIPO_VEHICULO.camioneta },
  { valor: 'motocicleta', etiqueta: ETIQUETA_TIPO_VEHICULO.motocicleta },
];

const ANIO_MAX_LENGTH = 4;

function claveVehiculo(vehiculo: Vehiculo): string {
  return String(vehiculo.id);
}

type TarjetaVehiculoProps = {
  vehiculo: Vehiculo;
  /** Highlights the vehicle the duplicated plate already belongs to (flow 4b). */
  resaltado: boolean;
};

const TarjetaVehiculo = memo(function TarjetaVehiculo({
  vehiculo,
  resaltado,
}: TarjetaVehiculoProps) {
  const theme = useTheme();

  return (
    <Card style={resaltado ? { borderColor: theme.tint, borderWidth: 2 } : undefined}>
      <View style={styles.encabezadoTarjeta}>
        <ThemedText type="smallBold">{vehiculo.placa}</ThemedText>
        <Badge label={ETIQUETA_TIPO_VEHICULO[vehiculo.tipo]} tone="info" />
      </View>

      <ThemedText type="small">
        {vehiculo.marca} {vehiculo.modelo}
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary">
        {vehiculo.color} · {vehiculo.anio}
      </ThemedText>
    </Card>
  );
});

export default function ClienteVehiculosScreen() {
  const theme = useTheme();
  const { toast, show, hide } = useToast();

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [isCargando, setIsCargando] = useState(true);
  const [tokenCarga, setTokenCarga] = useState(0);

  const [formularioVisible, setFormularioVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [placa, setPlaca] = useState('');
  const [tipo, setTipo] = useState<TipoVehiculo | null>(null);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [color, setColor] = useState('');
  const [anio, setAnio] = useState('');

  const [placaError, setPlacaError] = useState<string | null>(null);
  const [tipoError, setTipoError] = useState<string | null>(null);
  const [marcaError, setMarcaError] = useState<string | null>(null);
  const [modeloError, setModeloError] = useState<string | null>(null);
  const [colorError, setColorError] = useState<string | null>(null);
  const [anioError, setAnioError] = useState<string | null>(null);

  /** Normalised plate the backend rejected as already registered (flow 4b). */
  const [placaDuplicada, setPlacaDuplicada] = useState<string | null>(null);

  const placaRef = useRef<TextInput>(null);
  const marcaRef = useRef<TextInput>(null);
  const modeloRef = useRef<TextInput>(null);
  const colorRef = useRef<TextInput>(null);
  const anioRef = useRef<TextInput>(null);

  /**
   * The effect owns the request and only writes state from the promise
   * callbacks; a retry bumps `tokenCarga` and turns the spinner on there, the
   * same shape `useAsync` uses.
   */
  useEffect(() => {
    let cancelado = false;

    listarVehiculos()
      .then((lista) => {
        if (!cancelado) {
          setVehiculos(lista);
          setErrorMensaje(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelado) {
          setErrorMensaje(
            error instanceof Error ? error.message : 'No se pudieron cargar tus vehículos'
          );
        }
      })
      .finally(() => {
        if (!cancelado) {
          setIsCargando(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [tokenCarga]);

  const reintentar = useCallback(() => {
    setIsCargando(true);
    setErrorMensaje(null);
    setTokenCarga((token) => token + 1);
  }, []);

  const vehiculoDuplicado = useMemo(
    () =>
      placaDuplicada
        ? (vehiculos.find((vehiculo) => vehiculo.placa === placaDuplicada) ?? null)
        : null,
    [placaDuplicada, vehiculos]
  );

  const limpiarFormulario = useCallback(() => {
    setPlaca('');
    setTipo(null);
    setMarca('');
    setModelo('');
    setColor('');
    setAnio('');
    setPlacaError(null);
    setTipoError(null);
    setMarcaError(null);
    setModeloError(null);
    setColorError(null);
    setAnioError(null);
    setPlacaDuplicada(null);
  }, []);

  const abrirFormulario = useCallback(() => {
    limpiarFormulario();
    setFormularioVisible(true);
  }, [limpiarFormulario]);

  // Closing keeps what was typed: the user may be coming back to fix one field.
  const cerrarFormulario = useCallback(() => setFormularioVisible(false), []);

  /** Flow 4b: leaves the form and points at the vehicle that owns the plate. */
  const verVehiculoDuplicado = useCallback(() => setFormularioVisible(false), []);

  const handleSubmit = useCallback(async () => {
    const placaValue = normalizarPlaca(placa);
    const marcaValue = marca.trim();
    const modeloValue = modelo.trim();
    const colorValue = color.trim();
    const anioValue = anio.trim();

    // Every field is validated before focusing the first failing one, so the
    // user sees the full picture and keeps what was already typed (RNF-009 M4).
    const nextPlacaError = validarPlaca(placa);
    const nextTipoError = tipo === null ? 'Selecciona el tipo de vehículo' : null;
    const nextMarcaError = validarRequerido(marcaValue, 'El campo marca');
    const nextModeloError = validarRequerido(modeloValue, 'El campo modelo');
    const nextColorError = validarRequerido(colorValue, 'El campo color');
    const nextAnioError = validarAnio(anioValue);

    setPlacaError(nextPlacaError);
    setTipoError(nextTipoError);
    setMarcaError(nextMarcaError);
    setModeloError(nextModeloError);
    setColorError(nextColorError);
    setAnioError(nextAnioError);

    if (nextPlacaError) {
      placaRef.current?.focus();
      return;
    }
    if (tipo === null) {
      return;
    }
    if (nextMarcaError) {
      marcaRef.current?.focus();
      return;
    }
    if (nextModeloError) {
      modeloRef.current?.focus();
      return;
    }
    if (nextColorError) {
      colorRef.current?.focus();
      return;
    }
    if (nextAnioError) {
      anioRef.current?.focus();
      return;
    }

    setPlacaDuplicada(null);
    setIsSubmitting(true);

    try {
      const creado = await crearVehiculo({
        placa: placaValue,
        tipo,
        marca: marcaValue,
        modelo: modeloValue,
        color: colorValue,
        anio: Number(anioValue),
      });

      setVehiculos((previos) => [...previos, creado]);
      setIsSubmitting(false);
      setFormularioVisible(false);
      limpiarFormulario();
      show(`Vehículo ${creado.placa} registrado`);
    } catch (error) {
      setIsSubmitting(false);

      // Flow 4a and 4b: both land on the plate field instead of a toast, which
      // is where the user has to act.
      if (
        error instanceof ApiError &&
        (error.codigo === 'PLACA_DUPLICADA' || error.codigo === 'PLACA_INVALIDA')
      ) {
        setPlacaError(error.detalleDe('placa') ?? error.message);
        setPlacaDuplicada(error.codigo === 'PLACA_DUPLICADA' ? placaValue : null);
        placaRef.current?.focus();
        return;
      }

      show(
        error instanceof ApiError ? error.message : 'No se pudo registrar el vehículo',
        'error'
      );
    }
  }, [anio, color, limpiarFormulario, marca, modelo, placa, show, tipo]);

  const onSubmitPress = useCallback(() => {
    void handleSubmit();
  }, [handleSubmit]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Vehiculo>) => (
      <TarjetaVehiculo vehiculo={item} resaltado={item.id === vehiculoDuplicado?.id} />
    ),
    [vehiculoDuplicado?.id]
  );

  return (
    <>
      <Screen style={styles.pantalla}>
        <View style={styles.encabezado}>
          <ThemedText type="subtitle">Mis vehículos</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Necesitas al menos un vehículo registrado para poder reservar.
          </ThemedText>

          <Button title="Agregar vehículo" onPress={abrirFormulario} style={styles.cta} />
        </View>

        {isCargando ? (
          <Cargando mensaje="Cargando tus vehículos…" />
        ) : errorMensaje ? (
          <VistaError mensaje={errorMensaje} onReintentar={reintentar} />
        ) : vehiculos.length === 0 ? (
          <VistaVacia
            titulo="Aún no registraste vehículos"
            mensaje="Agrega la placa, el tipo y los datos de tu vehículo para reservar un lavado."
            accion={
              <Button title="Agregar vehículo" variant="secondary" onPress={abrirFormulario} />
            }
          />
        ) : (
          <FlatList
            data={vehiculos}
            keyExtractor={claveVehiculo}
            renderItem={renderItem}
            contentContainerStyle={styles.lista}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Screen>

      <Modal
        visible={formularioVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={cerrarFormulario}>
        <KeyboardAvoidingView
          style={styles.fondo}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.hoja, { backgroundColor: theme.background }]}>
            <ScrollView
              contentContainerStyle={styles.formulario}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.encabezadoHoja}>
                <ThemedText type="smallBold">Agregar vehículo</ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar el formulario"
                  hitSlop={Spacing.two}
                  onPress={cerrarFormulario}
                  style={({ pressed }) => (pressed ? styles.presionado : null)}>
                  <ThemedText type="smallBold" style={{ color: theme.accent }}>
                    Cerrar
                  </ThemedText>
                </Pressable>
              </View>

              <TextField
                ref={placaRef}
                label="Placa"
                value={placa}
                onChangeText={setPlaca}
                error={placaError}
                helper="Formatos válidos: ABC-123, A1B-123 o 1234-AB"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={PLACA_MAX_LENGTH}
                returnKeyType="next"
                onSubmitEditing={() => marcaRef.current?.focus()}
              />

              {vehiculoDuplicado ? (
                <Button
                  title={`Ver mi vehículo ${vehiculoDuplicado.placa}`}
                  variant="secondary"
                  onPress={verVehiculoDuplicado}
                />
              ) : null}

              <Selector
                label="Tipo de vehículo"
                opciones={OPCIONES_TIPO}
                valor={tipo}
                onChange={setTipo}
                error={tipoError}
              />

              <TextField
                ref={marcaRef}
                label="Marca"
                value={marca}
                onChangeText={setMarca}
                error={marcaError}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => modeloRef.current?.focus()}
              />

              <TextField
                ref={modeloRef}
                label="Modelo"
                value={modelo}
                onChangeText={setModelo}
                error={modeloError}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => colorRef.current?.focus()}
              />

              <TextField
                ref={colorRef}
                label="Color"
                value={color}
                onChangeText={setColor}
                error={colorError}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => anioRef.current?.focus()}
              />

              <TextField
                ref={anioRef}
                label="Año"
                value={anio}
                onChangeText={setAnio}
                error={anioError}
                keyboardType="number-pad"
                maxLength={ANIO_MAX_LENGTH}
                returnKeyType="done"
                onSubmitEditing={onSubmitPress}
              />

              <Button
                title="Guardar vehículo"
                loading={isSubmitting}
                onPress={onSubmitPress}
                style={styles.guardar}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Toast message={toast?.message ?? null} tone={toast?.tone} onHide={hide} />
    </>
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
  cta: {
    borderRadius: Radius.lg,
    marginTop: Spacing.two,
  },
  lista: {
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  encabezadoTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  fondo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  hoja: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    maxHeight: '90%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  formulario: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
  encabezadoHoja: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  guardar: {
    borderRadius: Radius.lg,
    marginTop: Spacing.two,
  },
  presionado: {
    opacity: 0.6,
  },
});
