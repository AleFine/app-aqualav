import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useRef, useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ConfirmarDialogo } from '@/components/confirmar-dialogo';
import { EstadoBadge } from '@/components/estado-badge';
import { Cargando, VistaError } from '@/components/estado-vista';
import { LineaTiempo } from '@/components/linea-tiempo';
import { Screen } from '@/components/screen';
import { Selector, type OpcionSelector } from '@/components/selector';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/services/api-client';
import { generarIdempotencyKey, registrarPago } from '@/services/pagos.service';
import {
  cambiarEstado,
  cancelarReserva,
  checkIn,
  checkOut,
  obtenerReserva,
} from '@/services/reservas.service';
import type { MedioPago } from '@/types/pago';
import type { EstadoReserva, Reserva } from '@/types/reserva';
import { etiquetaEstado, ETIQUETA_MEDIO_PAGO } from '@/utils/estados';
import {
  formatearDinero,
  formatearFecha,
  formatearHora,
  formatearRangoHorario,
} from '@/utils/formato';

/**
 * Operational detail of one reservation: check-in (RF-019), state changes
 * (RF-021), payment (RF-026) and delivery (RF-024).
 *
 * The action buttons are built by iterating `reserva.transiciones_permitidas`,
 * the array the API computes from the `transicion_estado` table filtered by the
 * caller's permissions. The screen never asks `if (estado === '...')`, so a new
 * row in that table reaches the phone without touching this file
 * (principle P3, RF-021 CA-03).
 */

type ModoCarga = 'inicial' | 'refresco';

/** Which action is running; `pago` is the only one that is not a transition. */
type AccionEnCurso = EstadoReserva | 'pago' | null;

/** Inline form currently open under the action list. */
type Panel = 'checkin' | 'entrega' | 'cancelar' | 'pago' | null;

/** Confirmation asked before an irreversible action (RNF-009 M2). */
type Confirmacion =
  | { tipo: 'retraso'; mensaje: string }
  | { tipo: 'entrega' }
  | { tipo: 'cancelar' }
  | { tipo: 'pago' }
  // Any other advance, including a state this build does not know about.
  | { tipo: 'estado'; destino: EstadoReserva }
  | null;

type Conformidad = 'si' | 'no';

type AccionEstado = {
  etiqueta: string;
  tono: 'primaria' | 'peligro';
};

/**
 * Label and tone of each target state. It only NAMES the transitions; which
 * ones exist is the API's answer, never this map's.
 */
const ACCION_POR_ESTADO: Partial<Record<EstadoReserva, AccionEstado>> = {
  en_atencion: { etiqueta: 'Registrar ingreso (check-in)', tono: 'primaria' },
  finalizado: { etiqueta: 'Finalizar servicio', tono: 'primaria' },
  entregado: { etiqueta: 'Entregar vehículo', tono: 'primaria' },
  cancelada: { etiqueta: 'Cancelar reserva', tono: 'peligro' },
};

/**
 * A state this build does not know about still gets a button: it is sent
 * through the generic `POST /reservas/{id}/estado`, which is what makes the
 * data-driven state machine work end to end (RF-021 CA-03).
 */
function accionDe(estado: EstadoReserva): AccionEstado {
  return (
    ACCION_POR_ESTADO[estado] ?? {
      etiqueta: `Avanzar a ${etiquetaEstado(estado)}`,
      tono: 'primaria',
    }
  );
}

const MEDIOS_PAGO: readonly OpcionSelector<MedioPago>[] = (
  Object.keys(ETIQUETA_MEDIO_PAGO) as MedioPago[]
).map((medio) => ({ valor: medio, etiqueta: ETIQUETA_MEDIO_PAGO[medio] }));

const CONFORMIDADES: readonly OpcionSelector<Conformidad>[] = [
  { valor: 'si', etiqueta: 'Conforme' },
  { valor: 'no', etiqueta: 'Con observaciones' },
];

const OBSERVACIONES_MAX_LENGTH = 500;
const MOTIVO_MAX_LENGTH = 300;

/** `"25.00"` (or `"25,00"`) -> `2500`. Money never travels as a float. */
function aCentimos(valor: string): number | null {
  const limpio = valor.trim().replace(',', '.');

  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) {
    return null;
  }

  return Math.round(Number(limpio) * 100);
}

/** `2500` -> `"25.00"`, the shape the amount field expects. */
function aSoles(centimos: number): string {
  return (centimos / 100).toFixed(2);
}

type DatoProps = {
  etiqueta: string;
  valor: string;
};

/** One label/value row of the detail cards. */
const Dato = memo(function Dato({ etiqueta, valor }: DatoProps) {
  return (
    <View style={styles.dato}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.datoEtiqueta}>
        {etiqueta}
      </ThemedText>
      <ThemedText type="small" style={styles.datoValor}>
        {valor}
      </ThemedText>
    </View>
  );
});

export default function PersonalReservaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { tiene } = useAuth();
  const { toast, show, hide } = useToast();

  const reservaId = Number(id);

  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCargando, setIsCargando] = useState(true);
  const [isRefrescando, setIsRefrescando] = useState(false);

  const [accion, setAccion] = useState<AccionEnCurso>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [confirmacion, setConfirmacion] = useState<Confirmacion>(null);

  const [observaciones, setObservaciones] = useState('');
  const [conformidad, setConformidad] = useState<Conformidad>('si');
  const [motivo, setMotivo] = useState('');
  const [motivoError, setMotivoError] = useState<string | null>(null);

  const [medio, setMedio] = useState<MedioPago | null>(null);
  const [medioError, setMedioError] = useState<string | null>(null);
  const [monto, setMonto] = useState('');
  const [montoError, setMontoError] = useState<string | null>(null);
  const [motivoDiferencia, setMotivoDiferencia] = useState('');
  const [motivoDiferenciaError, setMotivoDiferenciaError] = useState<string | null>(null);
  /** Set by a 422 `PAGO_PENDIENTE`: charging is the way out (RF-024 flow 2a). */
  const [pagoForzado, setPagoForzado] = useState(false);

  /**
   * One idempotency key per payment attempt (RF-026, RNF-017). It is created
   * just before the first request and kept for every retry, so a timeout that
   * actually reached the server replays the same payment instead of charging
   * twice (CA-02). It is cleared after a successful payment and whenever the
   * staff edits the form, because that is a different attempt.
   */
  const claveIdempotencia = useRef<string | null>(null);

  /** Tells the focus effect whether this is the first read of the screen. */
  const yaCargado = useRef(false);

  const cargar = useCallback(
    async (modo: ModoCarga) => {
      if (modo === 'inicial') {
        setIsCargando(true);
      } else {
        setIsRefrescando(true);
      }

      try {
        const datos = await obtenerReserva(reservaId);
        setReserva(datos);
        setError(null);
        yaCargado.current = true;
      } catch (causa) {
        const mensaje =
          causa instanceof ApiError ? causa.message : 'No se pudo cargar la reserva';

        if (modo === 'inicial') {
          setError(mensaje);
        } else {
          // A failed refresh keeps the reservation that is already on screen.
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
    [reservaId, show]
  );

  // The screen is a route of the staff tab navigator, so it loads (and reloads)
  // through the focus effect instead of a mount effect.
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

  const volver = useCallback(() => router.back(), [router]);

  const reportarError = useCallback(
    (causa: unknown, respaldo: string) => {
      if (causa instanceof ApiError) {
        // The API answers in Spanish naming the cause and the way out
        // (RNF-009 M3), so its message is the one worth showing.
        show(causa.message, 'error');

        if (causa.codigo === 'TRANSICION_INVALIDA') {
          // The screen was offering a stale action (RF-021 flow 4a, RF-019
          // CA-02): re-read the reservation so the buttons match the server.
          void cargar('refresco');
        }
        return;
      }

      show(respaldo, 'error');
    },
    [cargar, show]
  );

  const reiniciarClaveIdempotencia = useCallback(() => {
    claveIdempotencia.current = null;
  }, []);

  const abrirPago = useCallback(() => {
    if (!reserva) {
      return;
    }

    // The amount is prefilled with the tariff frozen at creation time.
    setMonto(aSoles(reserva.monto.monto_centimos));
    setMedio(null);
    setMedioError(null);
    setMontoError(null);
    setMotivoDiferencia('');
    setMotivoDiferenciaError(null);
    reiniciarClaveIdempotencia();
    setPanel('pago');
  }, [reiniciarClaveIdempotencia, reserva]);

  const cerrarPanel = useCallback(() => setPanel(null), []);

  /** Routes each allowed target state to the interaction it needs. */
  const elegirAccion = useCallback(
    (estado: EstadoReserva) => {
      switch (estado) {
        case 'en_atencion':
          setObservaciones('');
          setPanel('checkin');
          return;
        case 'entregado':
          setConformidad('si');
          setPanel('entrega');
          return;
        case 'cancelada':
          setMotivo('');
          setMotivoError(null);
          setPanel('cancelar');
          return;
        default:
          // `finalizado` and any state this build does not know about.
          // Advancing a state cannot be undone, so it is confirmed like every
          // other irreversible action on this screen (RNF-009 M2).
          setPanel(null);
          setConfirmacion({ tipo: 'estado', destino: estado });
      }
    },
    []
  );

  const ejecutarCambioDeEstado = useCallback(
    (destino: EstadoReserva) => {
      setConfirmacion(null);
      setAccion(destino);

      void (async () => {
        try {
          await cambiarEstado(reservaId, destino);
          await cargar('refresco');
          show(`Estado actualizado a ${etiquetaEstado(destino)}`);
        } catch (causa) {
          reportarError(causa, 'No se pudo actualizar el estado del servicio');
        } finally {
          setAccion(null);
        }
      })();
    },
    [cargar, reportarError, reservaId, show]
  );

  const ejecutarCheckIn = useCallback(
    async (confirmarRetraso: boolean) => {
      setAccion('en_atencion');

      try {
        await checkIn(reservaId, {
          observaciones: observaciones.trim(),
          confirmar_retraso: confirmarRetraso,
        });
        setPanel(null);
        setObservaciones('');
        await cargar('refresco');
        show('Ingreso registrado. El servicio pasó a En atención.');
      } catch (causa) {
        if (causa instanceof ApiError && causa.codigo === 'RETRASO_REQUIERE_CONFIRMACION') {
          // RF-019 flow 3a: the customer is more than 20 minutes late, so the
          // staff has to accept the delay explicitly before we insist.
          setConfirmacion({ tipo: 'retraso', mensaje: causa.message });
          return;
        }

        reportarError(causa, 'No se pudo registrar el ingreso');
      } finally {
        setAccion(null);
      }
    },
    [cargar, observaciones, reportarError, reservaId, show]
  );

  const confirmarIngreso = useCallback(() => {
    void ejecutarCheckIn(false);
  }, [ejecutarCheckIn]);

  const confirmarRetraso = useCallback(() => {
    setConfirmacion(null);
    void ejecutarCheckIn(true);
  }, [ejecutarCheckIn]);

  const pedirConfirmacionEntrega = useCallback(() => setConfirmacion({ tipo: 'entrega' }), []);

  const ejecutarEntrega = useCallback(() => {
    setConfirmacion(null);
    setAccion('entregado');

    void (async () => {
      try {
        await checkOut(reservaId, conformidad === 'si');
        setPanel(null);
        await cargar('refresco');
        show('Entrega registrada. La bahía queda libre.');
      } catch (causa) {
        if (causa instanceof ApiError && causa.codigo === 'PAGO_PENDIENTE') {
          // RF-024 flow 2a / CA-01: delivery is blocked until the service is
          // charged, so the screen opens the payment form right away.
          show(causa.message, 'error');
          setPagoForzado(true);
          abrirPago();
          return;
        }

        reportarError(causa, 'No se pudo registrar la entrega');
      } finally {
        setAccion(null);
      }
    })();
  }, [abrirPago, cargar, conformidad, reportarError, reservaId, show]);

  const escribirMotivo = useCallback((valor: string) => {
    setMotivo(valor);
    setMotivoError(null);
  }, []);

  const pedirConfirmacionCancelacion = useCallback(() => {
    const valor = motivo.trim();

    if (valor.length === 0) {
      setMotivoError('Indica el motivo de la cancelación');
      return;
    }

    setConfirmacion({ tipo: 'cancelar' });
  }, [motivo]);

  const ejecutarCancelacion = useCallback(() => {
    setConfirmacion(null);
    setAccion('cancelada');

    void (async () => {
      try {
        await cancelarReserva(reservaId, motivo.trim());
        setPanel(null);
        setMotivo('');
        await cargar('refresco');
        show('Reserva cancelada.');
      } catch (causa) {
        reportarError(causa, 'No se pudo cancelar la reserva');
      } finally {
        setAccion(null);
      }
    })();
  }, [cargar, motivo, reportarError, reservaId, show]);

  const elegirMedio = useCallback(
    (valor: MedioPago) => {
      setMedio(valor);
      setMedioError(null);
      reiniciarClaveIdempotencia();
    },
    [reiniciarClaveIdempotencia]
  );

  const escribirMonto = useCallback(
    (valor: string) => {
      setMonto(valor);
      setMontoError(null);
      reiniciarClaveIdempotencia();
    },
    [reiniciarClaveIdempotencia]
  );

  const escribirMotivoDiferencia = useCallback(
    (valor: string) => {
      setMotivoDiferencia(valor);
      setMotivoDiferenciaError(null);
      reiniciarClaveIdempotencia();
    },
    [reiniciarClaveIdempotencia]
  );

  const centimosCobrados = aCentimos(monto);
  const esperado = reserva?.monto.monto_centimos ?? null;
  // RF-026 flow 3a: a different amount has to be justified, so the field only
  // appears when it is actually needed.
  const montoDifiere =
    centimosCobrados !== null && esperado !== null && centimosCobrados !== esperado;

  const pedirConfirmacionPago = useCallback(() => {
    // Validate the whole form first and keep everything typed (RNF-009 M4).
    const proximoMedioError = medio ? null : 'Elige el medio de pago';
    const centimos = aCentimos(monto);

    let proximoMontoError: string | null = null;
    if (centimos === null) {
      proximoMontoError = 'Ingresa un monto válido en soles, por ejemplo 25.00';
    } else if (centimos <= 0) {
      proximoMontoError = 'El monto cobrado debe ser mayor que cero';
    }

    const difiere = centimos !== null && esperado !== null && centimos !== esperado;
    const proximoMotivoError =
      difiere && motivoDiferencia.trim().length === 0
        ? 'El monto no coincide con el de la reserva: indica el motivo de la diferencia'
        : null;

    setMedioError(proximoMedioError);
    setMontoError(proximoMontoError);
    setMotivoDiferenciaError(proximoMotivoError);

    if (proximoMedioError || proximoMontoError || proximoMotivoError) {
      return;
    }

    setConfirmacion({ tipo: 'pago' });
  }, [esperado, medio, monto, motivoDiferencia]);

  const ejecutarPago = useCallback(() => {
    const centimos = aCentimos(monto);

    if (!medio || centimos === null) {
      return;
    }

    setConfirmacion(null);
    setAccion('pago');

    // Created once per attempt and reused by every retry (RF-026 CA-02).
    if (!claveIdempotencia.current) {
      claveIdempotencia.current = generarIdempotencyKey();
    }

    const clave = claveIdempotencia.current;

    void (async () => {
      try {
        await registrarPago(
          reservaId,
          {
            medio,
            monto_centimos: centimos,
            motivo_diferencia: motivoDiferencia.trim() || null,
          },
          clave
        );

        // The attempt is closed: the next payment needs a brand new key.
        claveIdempotencia.current = null;
        setPanel(null);
        setPagoForzado(false);
        await cargar('refresco');
        show('Pago registrado.');
      } catch (causa) {
        if (causa instanceof ApiError) {
          if (causa.codigo === 'IDEMPOTENCY_KEY_REQUERIDA') {
            show(
              'El servidor no recibió la clave de idempotencia del cobro. Vuelve a intentarlo.',
              'error'
            );
            return;
          }

          if (causa.codigo === 'DATOS_INVALIDOS' || causa.codigo === 'VALIDACION') {
            // Field errors land on the field, not on a toast.
            setMontoError(causa.detalleDe('monto_centimos'));
            setMotivoDiferenciaError(causa.detalleDe('motivo_diferencia'));

            if (!causa.detalleDe('monto_centimos') && !causa.detalleDe('motivo_diferencia')) {
              show(causa.message, 'error');
            }
            return;
          }
        }

        // The key survives the failure on purpose: the retry must replay this
        // same payment instead of creating a second one.
        reportarError(causa, 'No se pudo registrar el pago');
      } finally {
        setAccion(null);
      }
    })();
  }, [cargar, medio, monto, motivoDiferencia, reportarError, reservaId, show]);

  const cerrarConfirmacion = useCallback(() => setConfirmacion(null), []);

  const confirmarAccion = useCallback(() => {
    switch (confirmacion?.tipo) {
      case 'retraso':
        confirmarRetraso();
        return;
      case 'entrega':
        ejecutarEntrega();
        return;
      case 'cancelar':
        ejecutarCancelacion();
        return;
      case 'pago':
        ejecutarPago();
        return;
      case 'estado':
        ejecutarCambioDeEstado(confirmacion.destino);
        return;
      default:
        setConfirmacion(null);
    }
  }, [
    confirmacion,
    confirmarRetraso,
    ejecutarCambioDeEstado,
    ejecutarCancelacion,
    ejecutarEntrega,
    ejecutarPago,
  ]);

  /**
   * Charging is offered from the same array the buttons come from: `entregado`
   * is an allowed transition exactly while the service is finished and waiting
   * to be handed back, which is when the counter charges (RN-09). After a 422
   * `PAGO_PENDIENTE` it is offered anyway (RF-024 flow 2a).
   */
  const puedeRegistrarPago =
    !!reserva &&
    reserva.pago === null &&
    tiene('pago:registrar') &&
    (reserva.transiciones_permitidas.includes('entregado') || pagoForzado);

  let contenido: ReactNode;

  if (isCargando) {
    contenido = <Cargando mensaje="Cargando la reserva…" />;
  } else if (error || !reserva) {
    contenido = (
      <VistaError mensaje={error ?? 'No se encontró la reserva'} onReintentar={reintentar} />
    );
  } else {
    contenido = (
      <ScrollView
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefrescando}
            onRefresh={refrescar}
            tintColor={theme.tint}
            colors={[theme.tint]}
          />
        }>
        <Card>
          <View style={styles.filaEntreExtremos}>
            <ThemedText type="smallBold">{reserva.codigo}</ThemedText>
            <EstadoBadge estado={reserva.estado} />
          </View>

          <Dato
            etiqueta="Cliente"
            valor={`${reserva.cliente.nombres} ${reserva.cliente.apellidos}`}
          />
          <Dato etiqueta="Teléfono" valor={reserva.cliente.telefono} />
          <Dato
            etiqueta="Vehículo"
            valor={`${reserva.vehiculo.placa} · ${reserva.vehiculo.marca} ${reserva.vehiculo.modelo}`}
          />
          <Dato
            etiqueta="Servicio"
            valor={`${reserva.servicio.nombre} · ${reserva.servicio.duracion_min} min`}
          />
          <Dato etiqueta="Bahía" valor={reserva.bahia.nombre} />
          <Dato
            etiqueta="Horario"
            valor={`${formatearFecha(reserva.inicio)} · ${formatearRangoHorario(reserva.inicio, reserva.fin)}`}
          />
          <Dato etiqueta="Monto" valor={formatearDinero(reserva.monto)} />

          {reserva.hora_ingreso ? (
            <Dato etiqueta="Ingreso" valor={formatearHora(reserva.hora_ingreso)} />
          ) : null}
          {reserva.hora_fin_real ? (
            <Dato etiqueta="Fin real" valor={formatearHora(reserva.hora_fin_real)} />
          ) : null}
          {reserva.hora_entrega ? (
            <Dato etiqueta="Entrega" valor={formatearHora(reserva.hora_entrega)} />
          ) : null}
        </Card>

        {reserva.cancelacion ? (
          <Card>
            <ThemedText type="smallBold">Cancelación</ThemedText>
            <Dato etiqueta="Motivo" valor={reserva.cancelacion.motivo} />
            <Dato
              etiqueta="Fecha"
              valor={`${formatearFecha(reserva.cancelacion.cancelada_en)} · ${formatearHora(reserva.cancelacion.cancelada_en)}`}
            />
            <Dato etiqueta="Autor" valor={reserva.cancelacion.autor ?? 'No registrado'} />
          </Card>
        ) : null}

        <Card>
          <ThemedText type="smallBold">Seguimiento</ThemedText>
          <LineaTiempo historial={reserva.historial} estadoActual={reserva.estado} />
        </Card>

        <Card>
          <View style={styles.filaEntreExtremos}>
            <ThemedText type="smallBold">Pago</ThemedText>
            {reserva.pago ? <Badge label={reserva.pago.estado} tone="exito" /> : null}
          </View>

          {reserva.pago ? (
            <>
              <Dato
                etiqueta="Medio"
                valor={ETIQUETA_MEDIO_PAGO[reserva.pago.medio] ?? reserva.pago.medio}
              />
              <Dato etiqueta="Monto" valor={formatearDinero(reserva.pago.monto)} />
              <Dato
                etiqueta="Registrado"
                valor={`${formatearFecha(reserva.pago.registrado_en)} · ${formatearHora(reserva.pago.registrado_en)}`}
              />
              <Dato etiqueta="Autor" valor={reserva.pago.autor ?? 'No registrado'} />
            </>
          ) : (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Sin pago registrado. El monto a cobrar es {formatearDinero(reserva.monto)}.
              </ThemedText>

              {puedeRegistrarPago ? (
                <Button
                  title="Registrar pago"
                  onPress={abrirPago}
                  disabled={accion !== null}
                  style={styles.accion}
                />
              ) : null}
            </>
          )}
        </Card>

        {reserva.transiciones_permitidas.length > 0 ? (
          <Card>
            <ThemedText type="smallBold">Acciones</ThemedText>

            {reserva.transiciones_permitidas.map((estado) => {
              const accionEstado = accionDe(estado);

              return (
                <Button
                  key={estado}
                  title={accionEstado.etiqueta}
                  loading={accion === estado}
                  disabled={accion !== null}
                  onPress={() => elegirAccion(estado)}
                  style={
                    accionEstado.tono === 'peligro'
                      ? [styles.accion, { backgroundColor: theme.danger }]
                      : styles.accion
                  }
                />
              );
            })}
          </Card>
        ) : null}

        {panel === 'checkin' ? (
          <Card>
            <ThemedText type="smallBold">Observaciones de ingreso</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Anota el estado del vehículo antes de empezar. Puedes dejarlo vacío.
            </ThemedText>

            <TextField
              label="Observaciones iniciales"
              value={observaciones}
              onChangeText={setObservaciones}
              maxLength={OBSERVACIONES_MAX_LENGTH}
              counter
              multiline
              numberOfLines={3}
            />

            <View style={styles.acciones}>
              <Button
                title="Volver"
                variant="secondary"
                onPress={cerrarPanel}
                disabled={accion !== null}
                style={styles.accionEnFila}
              />
              <Button
                title="Confirmar ingreso"
                loading={accion === 'en_atencion'}
                disabled={accion !== null}
                onPress={confirmarIngreso}
                style={styles.accionEnFila}
              />
            </View>
          </Card>
        ) : null}

        {panel === 'entrega' ? (
          <Card>
            <ThemedText type="smallBold">Entrega del vehículo</ThemedText>

            <Selector<Conformidad>
              label="Conformidad del cliente"
              opciones={CONFORMIDADES}
              valor={conformidad}
              onChange={setConformidad}
            />

            <View style={styles.acciones}>
              <Button
                title="Volver"
                variant="secondary"
                onPress={cerrarPanel}
                disabled={accion !== null}
                style={styles.accionEnFila}
              />
              <Button
                title="Entregar"
                loading={accion === 'entregado'}
                disabled={accion !== null}
                onPress={pedirConfirmacionEntrega}
                style={styles.accionEnFila}
              />
            </View>
          </Card>
        ) : null}

        {panel === 'cancelar' ? (
          <Card>
            <ThemedText type="smallBold">Cancelar la reserva</ThemedText>

            <TextField
              label="Motivo de la cancelación"
              value={motivo}
              onChangeText={escribirMotivo}
              error={motivoError}
              maxLength={MOTIVO_MAX_LENGTH}
              counter
              multiline
              numberOfLines={2}
            />

            <View style={styles.acciones}>
              <Button
                title="Volver"
                variant="secondary"
                onPress={cerrarPanel}
                disabled={accion !== null}
                style={styles.accionEnFila}
              />
              <Button
                title="Cancelar reserva"
                loading={accion === 'cancelada'}
                disabled={accion !== null}
                onPress={pedirConfirmacionCancelacion}
                style={[styles.accionEnFila, { backgroundColor: theme.danger }]}
              />
            </View>
          </Card>
        ) : null}

        {panel === 'pago' ? (
          <Card>
            <ThemedText type="smallBold">Registrar pago</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Monto esperado: {formatearDinero(reserva.monto)}
            </ThemedText>

            <Selector<MedioPago>
              label="Medio de pago"
              opciones={MEDIOS_PAGO}
              valor={medio}
              onChange={elegirMedio}
              error={medioError}
            />

            <TextField
              label="Monto cobrado (S/)"
              value={monto}
              onChangeText={escribirMonto}
              error={montoError}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />

            {montoDifiere ? (
              <TextField
                label="Motivo de la diferencia"
                value={motivoDiferencia}
                onChangeText={escribirMotivoDiferencia}
                error={motivoDiferenciaError}
                helper="Obligatorio cuando el monto cobrado no es el de la reserva"
                maxLength={MOTIVO_MAX_LENGTH}
                counter
              />
            ) : null}

            <View style={styles.acciones}>
              <Button
                title="Volver"
                variant="secondary"
                onPress={cerrarPanel}
                disabled={accion !== null}
                style={styles.accionEnFila}
              />
              <Button
                title="Registrar pago"
                loading={accion === 'pago'}
                disabled={accion !== null}
                onPress={pedirConfirmacionPago}
                style={styles.accionEnFila}
              />
            </View>
          </Card>
        ) : null}
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
            Atención de la reserva
          </ThemedText>
        </View>

        {contenido}
      </Screen>

      <ConfirmarDialogo
        visible={confirmacion?.tipo === 'retraso'}
        titulo="Cliente con retraso"
        mensaje={
          confirmacion?.tipo === 'retraso'
            ? `${confirmacion.mensaje} ¿Registras el ingreso de todos modos?`
            : ''
        }
        textoConfirmar="Registrar de todos modos"
        onConfirmar={confirmarAccion}
        onCancelar={cerrarConfirmacion}
      />

      <ConfirmarDialogo
        visible={confirmacion?.tipo === 'entrega'}
        titulo="Entregar el vehículo"
        mensaje={
          conformidad === 'si'
            ? 'Se registrará la entrega con la conformidad del cliente y la bahía quedará libre.'
            : 'Se registrará la entrega SIN la conformidad del cliente y la bahía quedará libre.'
        }
        textoConfirmar="Entregar"
        onConfirmar={confirmarAccion}
        onCancelar={cerrarConfirmacion}
      />

      <ConfirmarDialogo
        visible={confirmacion?.tipo === 'cancelar'}
        titulo="Cancelar la reserva"
        mensaje="La reserva quedará cancelada y su bahía volverá a estar disponible. No se puede deshacer."
        textoConfirmar="Cancelar reserva"
        tono="peligro"
        onConfirmar={confirmarAccion}
        onCancelar={cerrarConfirmacion}
      />

      <ConfirmarDialogo
        visible={confirmacion?.tipo === 'estado'}
        titulo="Avanzar el servicio"
        mensaje={
          confirmacion?.tipo === 'estado'
            ? `El servicio pasará a «${etiquetaEstado(confirmacion.destino)}» y quedará registrado en el historial. No se puede deshacer.`
            : ''
        }
        textoConfirmar="Avanzar"
        onConfirmar={confirmarAccion}
        onCancelar={cerrarConfirmacion}
      />

      <ConfirmarDialogo
        visible={confirmacion?.tipo === 'pago'}
        titulo="Confirmar el cobro"
        mensaje={
          medio
            ? `Se registrará un pago de S/ ${monto.trim().replace(',', '.')} por ${ETIQUETA_MEDIO_PAGO[medio] ?? medio}. El pago no se puede anular en esta versión.`
            : ''
        }
        textoConfirmar="Registrar pago"
        onConfirmar={confirmarAccion}
        onCancelar={cerrarConfirmacion}
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
  lista: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  filaEntreExtremos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  dato: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  datoEtiqueta: {
    width: 90,
  },
  datoValor: {
    flex: 1,
  },
  acciones: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  accion: {
    borderRadius: Radius.md,
  },
  accionEnFila: {
    flex: 1,
    borderRadius: Radius.md,
  },
  presionado: {
    opacity: 0.6,
  },
});
