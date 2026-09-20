import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { Cargando, VistaError } from '@/components/estado-vista';
import { Screen } from '@/components/screen';
import { Selector, type OpcionSelector } from '@/components/selector';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/services/api-client';
import { obtenerDisponibilidad } from '@/services/disponibilidad.service';
import { crearReserva } from '@/services/reservas.service';
import { obtenerServicio } from '@/services/servicios.service';
import { listarVehiculos } from '@/services/vehiculos.service';
import type { BloqueDisponible, Disponibilidad } from '@/types/disponibilidad';
import type { Servicio } from '@/types/servicio';
import type { Vehiculo } from '@/types/vehiculo';
import {
  aFechaIso,
  formatearDinero,
  formatearFechaLarga,
  formatearRangoHorario,
} from '@/utils/formato';

/**
 * RF-013 (availability) + RF-014 (booking), as ONE scrollable screen.
 *
 * A multi-route wizard would spend a tap per step; RNF-007 M1 caps the whole
 * booking at 6 taps and 2 minutes, so every step lives on the same screen:
 * service, vehicle, date, block and summary. With a single vehicle registered
 * it is preselected, which takes the happy path down to four taps.
 */

/** Peru has no DST, so its offset is constant and safe to hardcode. */
const DESFASE_LIMA = '-05:00';
const ZONA = 'America/Lima';
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Two weeks of dates: the same horizon the backend scans for RF-013 flow 3a. */
const DIAS_VISIBLES = 14;

/** Building an `Intl` formatter is expensive, so they are created once. */
function crearFormato(opciones: Intl.DateTimeFormatOptions): Intl.DateTimeFormat | null {
  try {
    return new Intl.DateTimeFormat('es-PE', { timeZone: ZONA, ...opciones });
  } catch {
    return null;
  }
}

const FORMATO_DIA_SEMANA = crearFormato({ weekday: 'short' });
const FORMATO_DIA_MES = crearFormato({ day: '2-digit', month: '2-digit' });

/**
 * `YYYY-MM-DD` -> a `Date` at noon in Lima. Parsing the bare date would place
 * it at UTC midnight, which is the PREVIOUS day in Lima; noon is immune to that.
 */
function aMediodiaLima(fecha: string): Date {
  return new Date(`${fecha}T12:00:00${DESFASE_LIMA}`);
}

/** The next `cantidad` dates, starting today, as `YYYY-MM-DD` in Lima. */
function construirDias(cantidad: number): string[] {
  const hoy = Date.now();
  const dias: string[] = [];

  for (let indice = 0; indice < cantidad; indice += 1) {
    dias.push(aFechaIso(new Date(hoy + indice * MS_POR_DIA)));
  }

  return dias;
}

function etiquetaDiaSemana(fecha: string): string {
  const valor = FORMATO_DIA_SEMANA?.format(aMediodiaLima(fecha)).replace('.', '');
  return valor ? valor.charAt(0).toUpperCase() + valor.slice(1) : fecha.slice(8);
}

function etiquetaDiaMes(fecha: string): string {
  return FORMATO_DIA_MES?.format(aMediodiaLima(fecha)) ?? fecha.slice(5);
}

function claveDia(fecha: string): string {
  return fecha;
}

function claveBloque(bloque: BloqueDisponible): string {
  return bloque.inicio;
}

type PildoraFechaProps = {
  fecha: string;
  encabezado: string;
  seleccionada: boolean;
  onPress: (fecha: string) => void;
};

const PildoraFecha = memo(function PildoraFecha({
  fecha,
  encabezado,
  seleccionada,
  onPress,
}: PildoraFechaProps) {
  const theme = useTheme();
  const handlePress = useCallback(() => onPress(fecha), [fecha, onPress]);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: seleccionada }}
      accessibilityLabel={`${encabezado} ${etiquetaDiaMes(fecha)}`}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.pildoraFecha,
        {
          backgroundColor: seleccionada ? theme.tint : theme.backgroundElement,
          borderColor: seleccionada ? theme.tint : theme.border,
        },
        pressed ? styles.presionado : null,
      ]}>
      <ThemedText
        type="small"
        style={{ color: seleccionada ? theme.tintText : theme.textSecondary }}>
        {encabezado}
      </ThemedText>
      <ThemedText
        type="smallBold"
        style={{ color: seleccionada ? theme.tintText : theme.text }}>
        {etiquetaDiaMes(fecha)}
      </ThemedText>
    </Pressable>
  );
});

type PildoraBloqueProps = {
  bloque: BloqueDisponible;
  seleccionado: boolean;
  onPress: (bloque: BloqueDisponible) => void;
};

const PildoraBloque = memo(function PildoraBloque({
  bloque,
  seleccionado,
  onPress,
}: PildoraBloqueProps) {
  const theme = useTheme();
  const handlePress = useCallback(() => onPress(bloque), [bloque, onPress]);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: seleccionado }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.pildoraBloque,
        {
          backgroundColor: seleccionado ? theme.tint : theme.backgroundElement,
          borderColor: seleccionado ? theme.tint : theme.border,
        },
        pressed ? styles.presionado : null,
      ]}>
      <ThemedText
        type="smallBold"
        style={{ color: seleccionado ? theme.tintText : theme.text }}>
        {formatearRangoHorario(bloque.inicio, bloque.fin)}
      </ThemedText>
      <ThemedText
        type="small"
        style={{ color: seleccionado ? theme.tintText : theme.textSecondary }}>
        {bloque.bahias_libres === 1 ? '1 bahía libre' : `${bloque.bahias_libres} bahías libres`}
      </ThemedText>
    </Pressable>
  );
});

export default function ReservarScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { servicioId } = useLocalSearchParams<{ servicioId: string }>();
  const { toast, show, hide } = useToast();

  const servicioIdNumero = Number(servicioId);
  const servicioIdValido = Number.isInteger(servicioIdNumero);

  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [isCargandoInicial, setIsCargandoInicial] = useState(servicioIdValido);
  const [errorInicial, setErrorInicial] = useState<string | null>(null);
  const [tokenInicial, setTokenInicial] = useState(0);

  /** The `Selector` works on strings, so the vehicle id travels as one. */
  const [vehiculoId, setVehiculoId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(() => aFechaIso(new Date()));
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
  const [isCargandoDisponibilidad, setIsCargandoDisponibilidad] = useState(true);
  const [errorDisponibilidad, setErrorDisponibilidad] = useState<string | null>(null);
  const [tokenDisponibilidad, setTokenDisponibilidad] = useState(0);
  const [bloque, setBloque] = useState<BloqueDisponible | null>(null);
  const [isEnviando, setIsEnviando] = useState(false);

  // The indicators are switched on by the state initializer and by the retry
  // handlers: a synchronous `setState` inside an effect cascades an extra
  // render, so the effects only fire their requests.
  useEffect(() => {
    if (!servicioIdValido) {
      return;
    }

    let cancelado = false;

    Promise.all([obtenerServicio(servicioIdNumero), listarVehiculos()])
      .then(([servicioCargado, vehiculosCargados]) => {
        if (cancelado) {
          return;
        }

        setServicio(servicioCargado);
        setVehiculos(vehiculosCargados);
        setErrorInicial(null);

        // One vehicle means there is nothing to choose: preselecting it saves a
        // tap of the six RNF-007 M1 allows.
        if (vehiculosCargados.length === 1) {
          setVehiculoId(String(vehiculosCargados[0].id));
        }
      })
      .catch((error: unknown) => {
        if (!cancelado) {
          setErrorInicial(
            error instanceof Error ? error.message : 'No se pudo cargar el servicio'
          );
        }
      })
      .finally(() => {
        if (!cancelado) {
          setIsCargandoInicial(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [servicioIdNumero, servicioIdValido, tokenInicial]);

  // RF-013 flow 1-4: every change of date asks the backend for the free blocks
  // of that date. `tokenDisponibilidad` also forces a re-read after a 409.
  useEffect(() => {
    if (!servicioIdValido) {
      return;
    }

    let cancelado = false;

    obtenerDisponibilidad(fecha, servicioIdNumero)
      .then((respuesta) => {
        if (!cancelado) {
          setDisponibilidad(respuesta);
        }
      })
      .catch((error: unknown) => {
        if (!cancelado) {
          setDisponibilidad(null);
          setErrorDisponibilidad(
            error instanceof Error ? error.message : 'No se pudo consultar la disponibilidad'
          );
        }
      })
      .finally(() => {
        if (!cancelado) {
          setIsCargandoDisponibilidad(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [fecha, servicioIdNumero, servicioIdValido, tokenDisponibilidad]);

  const dias = useMemo(() => {
    const base = construirDias(DIAS_VISIBLES);
    // `siguiente_fecha_disponible` may fall past the visible window.
    return base.includes(fecha) ? base : [...base, fecha].sort();
  }, [fecha]);

  const opcionesVehiculo = useMemo<OpcionSelector<string>[]>(
    () =>
      vehiculos.map((vehiculo) => ({
        valor: String(vehiculo.id),
        etiqueta: `${vehiculo.placa} · ${vehiculo.marca} ${vehiculo.modelo}`,
      })),
    [vehiculos]
  );

  const vehiculoSeleccionado = useMemo(
    () => vehiculos.find((vehiculo) => String(vehiculo.id) === vehiculoId) ?? null,
    [vehiculoId, vehiculos]
  );

  /** Turns the availability indicator on before a new read is triggered. */
  const marcarConsultaDisponibilidad = useCallback(() => {
    setIsCargandoDisponibilidad(true);
    setErrorDisponibilidad(null);
    setBloque(null);
  }, []);

  const seleccionarFecha = useCallback(
    (nueva: string) => {
      if (nueva === fecha) {
        return;
      }

      marcarConsultaDisponibilidad();
      setFecha(nueva);
    },
    [fecha, marcarConsultaDisponibilidad]
  );

  const seleccionarBloque = useCallback((elegido: BloqueDisponible) => setBloque(elegido), []);

  const reintentarInicial = useCallback(() => {
    setIsCargandoInicial(true);
    setErrorInicial(null);
    setTokenInicial((token) => token + 1);
  }, []);

  const reintentarDisponibilidad = useCallback(() => {
    marcarConsultaDisponibilidad();
    setTokenDisponibilidad((token) => token + 1);
  }, [marcarConsultaDisponibilidad]);

  const irAVehiculos = useCallback(() => router.navigate('/(cliente)/vehiculos'), [router]);

  const volver = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.navigate('/(cliente)/servicios');
  }, [router]);

  const siguienteFecha = disponibilidad?.siguiente_fecha_disponible ?? null;

  /** RF-013 flow 3a: jump straight to the next date that has free blocks. */
  const irASiguienteFecha = useCallback(() => {
    if (siguienteFecha) {
      marcarConsultaDisponibilidad();
      setFecha(siguienteFecha);
    }
  }, [marcarConsultaDisponibilidad, siguienteFecha]);

  const confirmar = useCallback(async () => {
    if (!servicio || !vehiculoSeleccionado || !bloque) {
      return;
    }

    setIsEnviando(true);

    try {
      const reserva = await crearReserva({
        servicio_id: servicio.id,
        vehiculo_id: vehiculoSeleccionado.id,
        inicio: bloque.inicio,
      });

      // `replace`: the wizard is done, so the back gesture must not return to a
      // form that would book a second time.
      router.replace({ pathname: '/(cliente)/reservas/[id]', params: { id: reserva.id } });
    } catch (error) {
      setIsEnviando(false);

      if (error instanceof ApiError) {
        // RF-014 CA-02: somebody else took the block first. The availability is
        // re-read on the spot so the user only sees blocks that are still free.
        if (error.codigo === 'RESERVA_BLOQUE_OCUPADO') {
          marcarConsultaDisponibilidad();
          setTokenDisponibilidad((token) => token + 1);
          show(`${error.message} Elige otro bloque disponible.`, 'error');
          return;
        }

        // RN-02 and RN-07: the chosen block is no longer valid, so the strip is
        // re-read as well instead of leaving a stale selection on screen.
        if (
          error.codigo === 'RESERVA_ANTICIPACION_INSUFICIENTE' ||
          error.codigo === 'RESERVA_FUERA_DE_HORARIO'
        ) {
          marcarConsultaDisponibilidad();
          setTokenDisponibilidad((token) => token + 1);
          show(error.message, 'error');
          return;
        }

        show(error.message, 'error');
        return;
      }

      show('No se pudo crear la reserva', 'error');
    }
  }, [bloque, marcarConsultaDisponibilidad, router, servicio, show, vehiculoSeleccionado]);

  const onConfirmarPress = useCallback(() => {
    void confirmar();
  }, [confirmar]);

  const renderDia = useCallback(
    ({ item, index }: ListRenderItemInfo<string>) => (
      <PildoraFecha
        fecha={item}
        encabezado={index === 0 ? 'Hoy' : index === 1 ? 'Mañana' : etiquetaDiaSemana(item)}
        seleccionada={item === fecha}
        onPress={seleccionarFecha}
      />
    ),
    [fecha, seleccionarFecha]
  );

  if (isCargandoInicial) {
    return (
      <Screen style={styles.pantalla}>
        <Cargando mensaje="Preparando tu reserva…" />
      </Screen>
    );
  }

  if (errorInicial || !servicio) {
    return (
      <Screen style={styles.pantalla}>
        <VistaError
          mensaje={
            errorInicial ??
            (servicioIdValido ? 'No se pudo cargar el servicio' : 'El servicio solicitado no existe')
          }
          onReintentar={servicioIdValido ? reintentarInicial : undefined}
        />
      </Screen>
    );
  }

  const sinVehiculos = vehiculos.length === 0;
  const puedeConfirmar = !!vehiculoSeleccionado && !!bloque;

  return (
    <>
      <Screen style={styles.pantalla}>
        <ScrollView
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
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

          <ThemedText type="subtitle">Reservar</ThemedText>

          <Card>
            <View style={styles.encabezadoTarjeta}>
              <ThemedText type="smallBold" style={styles.flexible}>
                {servicio.nombre}
              </ThemedText>
              <Badge label={`${servicio.duracion_min} min`} tone="info" />
            </View>

            <ThemedText type="small" themeColor="textSecondary">
              {servicio.descripcion}
            </ThemedText>

            <View style={styles.filaPrecio}>
              <ThemedText type="smallBold">{formatearDinero(servicio.precio)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                IGV incluido
              </ThemedText>
            </View>
          </Card>

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.paso}>
            1 · VEHÍCULO
          </ThemedText>

          {sinVehiculos ? (
            // RF-014 flow 1a / RN-01: without a vehicle of their own the client
            // cannot book, so the flow stops here and points at RF-007.
            <Card>
              <ThemedText type="smallBold">Necesitas un vehículo registrado</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Solo puedes reservar para un vehículo registrado en tu cuenta. Agrega uno y
                vuelve para continuar con la reserva.
              </ThemedText>
              <Button title="Registrar un vehículo" onPress={irAVehiculos} />
            </Card>
          ) : (
            <Selector
              label="Elige el vehículo"
              opciones={opcionesVehiculo}
              valor={vehiculoId}
              onChange={setVehiculoId}
            />
          )}

          {sinVehiculos ? null : (
            <>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.paso}>
                2 · FECHA
              </ThemedText>

              <FlatList
                data={dias}
                horizontal
                keyExtractor={claveDia}
                renderItem={renderDia}
                contentContainerStyle={styles.tiraFechas}
                showsHorizontalScrollIndicator={false}
              />

              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.paso}>
                3 · HORARIO
              </ThemedText>

              {isCargandoDisponibilidad ? (
                <View style={styles.estadoIncrustado}>
                  <Cargando mensaje="Buscando horarios libres…" />
                </View>
              ) : errorDisponibilidad ? (
                <View style={styles.estadoIncrustado}>
                  <VistaError
                    mensaje={errorDisponibilidad}
                    onReintentar={reintentarDisponibilidad}
                  />
                </View>
              ) : !disponibilidad ? null : !disponibilidad.laborable ? (
                // Flow 4a: the day is outside the opening hours (RN-07).
                <Card>
                  <ThemedText type="smallBold">Día no laborable</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    El lavadero no atiende el {formatearFechaLarga(`${fecha}T12:00:00${DESFASE_LIMA}`)}.
                    Elige otra fecha para continuar.
                  </ThemedText>
                  {siguienteFecha ? (
                    <Button
                      title="Ir al próximo día disponible"
                      variant="secondary"
                      onPress={irASiguienteFecha}
                    />
                  ) : null}
                </Card>
              ) : disponibilidad.bloques.length === 0 ? (
                // Flow 3a: no free block that day; the backend already scanned
                // forward for the next date with availability.
                <Card>
                  <ThemedText type="smallBold">No hay cupos ese día</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {siguienteFecha
                      ? 'Todos los bloques están ocupados. Te llevamos al próximo día con cupos libres.'
                      : 'Todos los bloques están ocupados y no hay cupos en las próximas dos semanas. Prueba con otra fecha más adelante.'}
                  </ThemedText>
                  {siguienteFecha ? (
                    <Button
                      title={`Ver el ${etiquetaDiaMes(siguienteFecha)}`}
                      variant="secondary"
                      onPress={irASiguienteFecha}
                    />
                  ) : null}
                </Card>
              ) : (
                <View style={styles.rejillaBloques}>
                  {disponibilidad.bloques.map((disponible) => (
                    <PildoraBloque
                      key={claveBloque(disponible)}
                      bloque={disponible}
                      seleccionado={bloque?.inicio === disponible.inicio}
                      onPress={seleccionarBloque}
                    />
                  ))}
                </View>
              )}

              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.paso}>
                4 · RESUMEN
              </ThemedText>

              <Card>
                <View style={styles.filaResumen}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Servicio
                  </ThemedText>
                  <ThemedText type="smallBold" style={styles.valorResumen}>
                    {servicio.nombre}
                  </ThemedText>
                </View>

                <View style={styles.filaResumen}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Vehículo
                  </ThemedText>
                  <ThemedText type="smallBold" style={styles.valorResumen}>
                    {vehiculoSeleccionado
                      ? `${vehiculoSeleccionado.placa} · ${vehiculoSeleccionado.marca} ${vehiculoSeleccionado.modelo}`
                      : 'Sin elegir'}
                  </ThemedText>
                </View>

                <View style={styles.filaResumen}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Fecha y hora
                  </ThemedText>
                  <ThemedText type="smallBold" style={styles.valorResumen}>
                    {bloque
                      ? `${formatearFechaLarga(bloque.inicio)} · ${formatearRangoHorario(bloque.inicio, bloque.fin)}`
                      : 'Sin elegir'}
                  </ThemedText>
                </View>

                <View style={styles.filaResumen}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Monto
                  </ThemedText>
                  <ThemedText type="smallBold" style={styles.valorResumen}>
                    {formatearDinero(servicio.precio)} · IGV incluido
                  </ThemedText>
                </View>
              </Card>

              {puedeConfirmar ? null : (
                <ThemedText type="small" themeColor="textSecondary" style={styles.ayuda}>
                  Elige un vehículo y un bloque horario para confirmar la reserva.
                </ThemedText>
              )}

              <Button
                title="Confirmar reserva"
                loading={isEnviando}
                disabled={!puedeConfirmar}
                onPress={onConfirmarPress}
                style={styles.confirmar}
              />
            </>
          )}
        </ScrollView>
      </Screen>

      <Toast message={toast?.message ?? null} tone={toast?.tone} onHide={hide} />
    </>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    paddingTop: Spacing.three,
  },
  contenido: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  volver: {
    alignSelf: 'flex-start',
  },
  encabezadoTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  flexible: {
    flexShrink: 1,
  },
  filaPrecio: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  paso: {
    letterSpacing: 1,
    paddingTop: Spacing.two,
  },
  tiraFechas: {
    gap: Spacing.two,
    paddingVertical: Spacing.half,
  },
  pildoraFecha: {
    minWidth: 72,
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  rejillaBloques: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pildoraBloque: {
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  estadoIncrustado: {
    minHeight: 140,
  },
  filaResumen: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  valorResumen: {
    flexShrink: 1,
    textAlign: 'right',
  },
  ayuda: {
    textAlign: 'center',
  },
  confirmar: {
    borderRadius: Radius.lg,
  },
  presionado: {
    opacity: 0.7,
  },
});
