import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type TextInput,
} from 'react-native';

import { ConfirmarDialogo } from '@/components/confirmar-dialogo';
import { EstadoBadge } from '@/components/estado-badge';
import { Cargando, VistaError } from '@/components/estado-vista';
import { LineaTiempo } from '@/components/linea-tiempo';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/services/api-client';
import { cancelarReserva, obtenerReserva } from '@/services/reservas.service';
import type { Dinero } from '@/types/common';
import type { Reserva } from '@/types/reserva';
import { ETIQUETA_MEDIO_PAGO, ETIQUETA_TIPO_VEHICULO } from '@/utils/estados';
import {
  formatearDinero,
  formatearFechaLarga,
  formatearHora,
  formatearRangoHorario,
} from '@/utils/formato';
import { validarRequerido } from '@/utils/validation';

/**
 * RF-022 (tracking) + RF-016 (cancellation).
 *
 * The MVP has no push and no polling: the view is refreshed by asking for it,
 * on mount and with pull-to-refresh, and it always states when it last read the
 * server so a failed refresh can keep showing the last known state (flow 3a).
 *
 * The cancel action is rendered from `reserva.transiciones_permitidas` — the
 * client half of the data-driven state machine (P3) — never from a local
 * comparison against `estado`.
 */

/** RN-05 simplified: the MVP policy always returns a zero penalty (RF-016). */
const SIN_PENALIDAD: Dinero = { monto_centimos: 0, moneda: 'PEN' };

const MOTIVO_MAX_LENGTH = 300;

type DatoProps = {
  etiqueta: string;
  valor: string;
};

const Dato = memo(function Dato({ etiqueta, valor }: DatoProps) {
  return (
    <View style={styles.dato}>
      <ThemedText type="small" themeColor="textSecondary">
        {etiqueta}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.datoValor}>
        {valor}
      </ThemedText>
    </View>
  );
});

export default function ClienteReservaDetalleScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { toast, show, hide } = useToast();

  const reservaId = Number(id);
  const reservaIdValido = Number.isInteger(reservaId);

  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [isCargando, setIsCargando] = useState(reservaIdValido);
  const [isRefrescando, setIsRefrescando] = useState(false);
  const [tokenCarga, setTokenCarga] = useState(0);
  /** Timestamp of the last successful read (RF-022 CA-01 and flow 3a). */
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null);

  const [motivoVisible, setMotivoVisible] = useState(false);
  const [confirmarVisible, setConfirmarVisible] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [motivoError, setMotivoError] = useState<string | null>(null);
  const [isCancelando, setIsCancelando] = useState(false);

  const motivoRef = useRef<TextInput>(null);
  /** True once a read succeeded, so a later failure can keep the last state. */
  const tieneDatosRef = useRef(false);

  /**
   * The effect owns the request and only writes state from the promise
   * callbacks. Every re-read — pull to refresh, retry, or the refresh that
   * follows a rejected transition — bumps `tokenCarga` and turns its own
   * indicator on, which is what keeps the effect free of synchronous state
   * writes.
   */
  useEffect(() => {
    if (!reservaIdValido) {
      return;
    }

    let cancelado = false;

    obtenerReserva(reservaId)
      .then((actualizada) => {
        if (cancelado) {
          return;
        }

        setReserva(actualizada);
        setActualizadoEn(new Date());
        setErrorMensaje(null);
        tieneDatosRef.current = true;
      })
      .catch((error: unknown) => {
        if (cancelado) {
          return;
        }

        const mensaje = error instanceof Error ? error.message : 'No se pudo cargar la reserva';

        // Flow 3a: keep the last known state on screen and only warn about the
        // failed refresh; the header still says when it was read.
        if (tieneDatosRef.current) {
          show(`${mensaje} Se muestra el último estado consultado.`, 'error');
        } else {
          setErrorMensaje(mensaje);
        }
      })
      .finally(() => {
        if (!cancelado) {
          setIsCargando(false);
          setIsRefrescando(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [reservaId, reservaIdValido, show, tokenCarga]);

  const refrescar = useCallback(() => {
    setIsRefrescando(true);
    setTokenCarga((token) => token + 1);
  }, []);

  const reintentar = useCallback(() => {
    setIsCargando(true);
    setErrorMensaje(null);
    setTokenCarga((token) => token + 1);
  }, []);

  const volver = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.navigate('/(cliente)/inicio');
  }, [router]);

  const abrirCancelacion = useCallback(() => {
    setMotivo('');
    setMotivoError(null);
    setMotivoVisible(true);
  }, []);

  const cerrarCancelacion = useCallback(() => setMotivoVisible(false), []);

  /** RF-016 flow 1 and 3: the motivo is required before asking to confirm. */
  const continuarCancelacion = useCallback(() => {
    const error = validarRequerido(motivo, 'El motivo');
    setMotivoError(error);

    if (error) {
      motivoRef.current?.focus();
      return;
    }

    setMotivoVisible(false);
    setConfirmarVisible(true);
  }, [motivo]);

  const cancelarConfirmacion = useCallback(() => setConfirmarVisible(false), []);

  const confirmarCancelacion = useCallback(() => {
    setConfirmarVisible(false);
    setIsCancelando(true);

    cancelarReserva(reservaId, motivo.trim())
      .then((actualizada) => {
        setReserva(actualizada);
        setActualizadoEn(new Date());
        setMotivo('');
        show('Tu reserva fue cancelada y el bloque volvió a estar disponible');
      })
      .catch((error: unknown) => {
        // CA-02: the reservation already started, so the transition is rejected.
        if (error instanceof ApiError && error.codigo === 'TRANSICION_INVALIDA') {
          show(`${error.message} Comunícate con recepción para gestionarla.`, 'error');
          // Re-read so the actions match the state the server really has.
          setTokenCarga((token) => token + 1);
          return;
        }

        show(
          error instanceof ApiError ? error.message : 'No se pudo cancelar la reserva',
          'error'
        );
      })
      .finally(() => setIsCancelando(false));
  }, [motivo, reservaId, show]);

  if (isCargando && !reserva) {
    return (
      <Screen style={styles.pantalla}>
        <Cargando mensaje="Cargando tu reserva…" />
      </Screen>
    );
  }

  if (!reserva) {
    return (
      <Screen style={styles.pantalla}>
        <VistaError
          mensaje={
            errorMensaje ??
            (reservaIdValido ? 'No se pudo cargar la reserva' : 'La reserva solicitada no existe')
          }
          onReintentar={reservaIdValido ? reintentar : undefined}
        />
      </Screen>
    );
  }

  const puedeCancelar = reserva.transiciones_permitidas.includes('cancelada');
  /**
   * Informational note of RF-016 flow 4a. It never decides whether the action
   * is available — `transiciones_permitidas` does — it only explains why the
   * button is gone once the vehicle is already inside.
   */
  const mostrarAvisoEnCurso =
    !puedeCancelar &&
    reserva.cancelacion === null &&
    reserva.hora_ingreso !== null &&
    reserva.hora_entrega === null;

  return (
    <>
      <Screen style={styles.pantalla}>
        <ScrollView
          contentContainerStyle={styles.contenido}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefrescando}
              onRefresh={refrescar}
              tintColor={theme.tint}
              colors={[theme.tint]}
            />
          }>
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

          <View style={styles.encabezado}>
            <ThemedText type="subtitle">{reserva.codigo}</ThemedText>
            <EstadoBadge estado={reserva.estado} />
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            {actualizadoEn
              ? `Actualizado a las ${formatearHora(actualizadoEn.toISOString())} · desliza hacia abajo para actualizar`
              : 'Desliza hacia abajo para actualizar'}
          </ThemedText>

          <Card>
            <ThemedText type="smallBold">Avance del servicio</ThemedText>
            <LineaTiempo historial={reserva.historial} estadoActual={reserva.estado} />
          </Card>

          <Card>
            <ThemedText type="smallBold">Servicio</ThemedText>
            <Dato etiqueta="Nombre" valor={reserva.servicio.nombre} />
            <Dato etiqueta="Duración" valor={`${reserva.servicio.duracion_min} minutos`} />
            <Dato etiqueta="Monto" valor={`${formatearDinero(reserva.monto)} (IGV incluido)`} />
            <Dato etiqueta="Bahía" valor={reserva.bahia.nombre} />
          </Card>

          <Card>
            <ThemedText type="smallBold">Vehículo</ThemedText>
            <Dato etiqueta="Placa" valor={reserva.vehiculo.placa} />
            <Dato etiqueta="Tipo" valor={ETIQUETA_TIPO_VEHICULO[reserva.vehiculo.tipo]} />
            <Dato
              etiqueta="Marca y modelo"
              valor={`${reserva.vehiculo.marca} ${reserva.vehiculo.modelo}`}
            />
          </Card>

          <Card>
            <ThemedText type="smallBold">Fecha y horario</ThemedText>
            <Dato etiqueta="Fecha" valor={formatearFechaLarga(reserva.inicio)} />
            <Dato
              etiqueta="Horario reservado"
              valor={formatearRangoHorario(reserva.inicio, reserva.fin)}
            />

            {reserva.hora_ingreso ? (
              <Dato etiqueta="Hora de ingreso" valor={formatearHora(reserva.hora_ingreso)} />
            ) : null}

            {/* CA-02: the estimate while the service is running, the real hours
                once the staff registered them. */}
            {reserva.hora_entrega === null && reserva.cancelacion === null ? (
              <Dato
                etiqueta="Hora estimada de entrega"
                valor={formatearHora(reserva.fin_estimado)}
              />
            ) : null}

            {reserva.hora_fin_real ? (
              <Dato
                etiqueta="Hora real de término"
                valor={formatearHora(reserva.hora_fin_real)}
              />
            ) : null}

            {reserva.hora_entrega ? (
              <Dato etiqueta="Hora de entrega" valor={formatearHora(reserva.hora_entrega)} />
            ) : null}
          </Card>

          {reserva.pago ? (
            <Card>
              <ThemedText type="smallBold">Pago</ThemedText>
              <Dato etiqueta="Monto" valor={formatearDinero(reserva.pago.monto)} />
              <Dato etiqueta="Medio" valor={ETIQUETA_MEDIO_PAGO[reserva.pago.medio]} />
              <Dato etiqueta="Estado" valor={reserva.pago.estado} />
              <Dato
                etiqueta="Registrado"
                valor={`${formatearFechaLarga(reserva.pago.registrado_en)} · ${formatearHora(reserva.pago.registrado_en)}`}
              />
              {reserva.pago.autor ? (
                <Dato etiqueta="Registrado por" valor={reserva.pago.autor} />
              ) : null}
            </Card>
          ) : null}

          {/* CA-03: after a cancellation the motive, the author and the date. */}
          {reserva.cancelacion ? (
            <Card>
              <ThemedText type="smallBold" style={{ color: theme.danger }}>
                Reserva cancelada
              </ThemedText>
              <Dato etiqueta="Motivo" valor={reserva.cancelacion.motivo} />
              <Dato
                etiqueta="Cancelada el"
                valor={`${formatearFechaLarga(reserva.cancelacion.cancelada_en)} · ${formatearHora(reserva.cancelacion.cancelada_en)}`}
              />
              <Dato etiqueta="Cancelada por" valor={reserva.cancelacion.autor ?? 'Sin registrar'} />
              <Dato
                etiqueta="Penalidad"
                valor={formatearDinero(reserva.penalidad ?? SIN_PENALIDAD)}
              />
            </Card>
          ) : null}

          {puedeCancelar ? (
            <Button
              title="Cancelar reserva"
              loading={isCancelando}
              onPress={abrirCancelacion}
              style={[styles.cancelar, { backgroundColor: theme.danger }]}
            />
          ) : null}

          {mostrarAvisoEnCurso ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.aviso}>
              Tu vehículo ya ingresó al lavadero, así que la reserva no puede cancelarse desde
              la app. Comunícate con recepción si necesitas ayuda.
            </ThemedText>
          ) : null}
        </ScrollView>
      </Screen>

      <Modal
        visible={motivoVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={cerrarCancelacion}>
        <KeyboardAvoidingView
          style={styles.fondo}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.hoja, { backgroundColor: theme.background }]}>
            <ScrollView
              contentContainerStyle={styles.formulario}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <ThemedText type="smallBold">Cancelar la reserva {reserva.codigo}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Cuéntanos por qué cancelas para liberar el bloque horario.
              </ThemedText>

              <TextField
                ref={motivoRef}
                label="Motivo de la cancelación"
                value={motivo}
                onChangeText={setMotivo}
                error={motivoError}
                maxLength={MOTIVO_MAX_LENGTH}
                counter
                multiline
                returnKeyType="done"
              />

              {/* RF-016 step 2: the policy of the MVP always charges nothing. */}
              <View style={styles.penalidad}>
                <ThemedText type="small" themeColor="textSecondary">
                  Penalidad por cancelar
                </ThemedText>
                <ThemedText type="smallBold">{formatearDinero(SIN_PENALIDAD)}</ThemedText>
              </View>

              <View style={styles.acciones}>
                <Button
                  title="Volver"
                  variant="secondary"
                  onPress={cerrarCancelacion}
                  style={styles.accion}
                />
                <Button
                  title="Continuar"
                  onPress={continuarCancelacion}
                  style={styles.accion}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmarDialogo
        visible={confirmarVisible}
        titulo="¿Cancelar la reserva?"
        mensaje={`Motivo: ${motivo.trim()}\nPenalidad: ${formatearDinero(SIN_PENALIDAD)}\n\nLa reserva ${reserva.codigo} quedará cancelada y su bloque horario volverá a ofrecerse.`}
        textoConfirmar="Sí, cancelar"
        tono="peligro"
        onConfirmar={confirmarCancelacion}
        onCancelar={cancelarConfirmacion}
      />

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
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  dato: {
    gap: Spacing.half,
  },
  datoValor: {
    flexShrink: 1,
  },
  cancelar: {
    borderRadius: Radius.lg,
    marginTop: Spacing.two,
  },
  aviso: {
    textAlign: 'center',
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
  penalidad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  acciones: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  accion: {
    flex: 1,
    borderRadius: Radius.md,
  },
  presionado: {
    opacity: 0.6,
  },
});
