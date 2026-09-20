/** Reservation domain: mirrors `ReservaOut` (RF-014, RF-017, RF-022). */

import type { Dinero } from '@/types/common';
import type { Pago } from '@/types/pago';
import type { TipoVehiculo } from '@/types/vehiculo';

/** The five states of Annex A that this build knows how to name. */
export type EstadoConocido =
  | 'confirmada'
  | 'en_atencion'
  | 'finalizado'
  | 'entregado'
  | 'cancelada';

/**
 * A reservation state as the API emits it.
 *
 * Deliberately OPEN. The set of states lives in the `transicion_estado` table,
 * not in this union: Annex A plans six more states for v0.4/v1.0, each added as
 * a row with no code change (principle P3, RF-021 CA-03). Pinning the union
 * shut would turn a data migration back into a release. `string & {}` keeps
 * autocomplete on the known five while accepting the ones we have not met yet.
 */
export type EstadoReserva = EstadoConocido | (string & {});

/** Embedded service summary inside `ReservaOut`. */
export type ReservaServicio = {
  id: number;
  nombre: string;
  duracion_min: number;
};

/** Embedded vehicle summary inside `ReservaOut`. */
export type ReservaVehiculo = {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  tipo: TipoVehiculo;
};

/** Embedded bay summary inside `ReservaOut`. */
export type ReservaBahia = {
  id: number;
  nombre: string;
};

/** Embedded client summary inside `ReservaOut`. */
export type ReservaCliente = {
  id: number;
  nombres: string;
  apellidos: string;
  telefono: string;
};

/** One row of `reserva_estado_historial`, used by the RF-022 timeline. */
export type HistorialEstado = {
  estado: EstadoReserva;
  ocurrido_en: string;
  autor: string | null;
};

/** Present only when the reservation was cancelled (RF-016). */
export type CancelacionReserva = {
  motivo: string;
  cancelada_en: string;
  autor: string | null;
};

export type Reserva = {
  id: number;
  /** `AQL-XXXXXX`. */
  codigo: string;
  estado: EstadoReserva;
  inicio: string;
  fin: string;
  creada_en: string;
  /** Frozen at creation time (RF-014 CA-03). */
  monto: Dinero;
  modalidad_pago: string;
  servicio: ReservaServicio;
  vehiculo: ReservaVehiculo;
  bahia: ReservaBahia;
  cliente: ReservaCliente;
  /**
   * Next states the CALLER may reach, already filtered by their permissions.
   * Screens render their action buttons from this array and never hardcode the
   * state machine.
   */
  transiciones_permitidas: EstadoReserva[];
  hora_ingreso: string | null;
  hora_fin_real: string | null;
  hora_entrega: string | null;
  fin_estimado: string;
  cancelacion: CancelacionReserva | null;
  pago: Pago | null;
  historial: HistorialEstado[];
  /** Only returned by the cancellation endpoint; always zero in the MVP. */
  penalidad?: Dinero | null;
};

/** Body of `POST /reservas`. `fin` is computed server-side. */
export type CrearReservaInput = {
  servicio_id: number;
  vehiculo_id: number;
  /** ISO-8601 with offset. */
  inicio: string;
};

/** Body of `POST /reservas/{id}/cancelacion`. */
export type CancelarReservaInput = {
  motivo: string;
};

/** Body of `POST /reservas/{id}/check-in`. */
export type CheckInInput = {
  observaciones: string;
  /** Re-send as `true` after a 409 `RETRASO_REQUIERE_CONFIRMACION`. */
  confirmar_retraso: boolean;
};

/** Body of `POST /reservas/{id}/estado`. */
export type CambiarEstadoInput = {
  estado: EstadoReserva;
};

/** Body of `POST /reservas/{id}/check-out`. */
export type CheckOutInput = {
  conformidad_cliente: boolean;
};

/** Query parameters of `GET /reservas`. */
export type ListarReservasParams = {
  estado?: EstadoReserva;
  pagina?: number;
  /** Defaults to 20 server-side, max 50. */
  tamanio?: number;
};

/** Query parameters of `GET /reservas/buscar`: one of the two, not both. */
export type BuscarReservasParams = {
  codigo?: string;
  placa?: string;
};
