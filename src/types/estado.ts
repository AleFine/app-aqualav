/** State catalogue: mirrors `GET /api/v1/estados` (EXTENSION POINT P3). */

import type { EstadoReserva } from '@/types/reserva';

/**
 * One reservation state as the API derives it from `transicion_estado`.
 *
 * Aggregate screens (the staff board, the history filters, the timeline) need
 * the WHOLE set of states, which no single reservation can tell them. Reading
 * it from here is what keeps a state added as data from disappearing off those
 * screens (principle P3, RF-021 CA-03).
 */
export type EstadoCatalogo = {
  /** The exact string the API stores and emits. */
  codigo: EstadoReserva;
  /** No declared move leaves it: a reservation there is done. */
  terminal: boolean;
  /** It belongs to the main flow of a service, not to an exception branch
   *  such as cancelling. The timeline renders the pending steps from these. */
  principal: boolean;
  /** Display order, main flow first. A hint, never a business rule. */
  orden: number;
};
