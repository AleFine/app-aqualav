import { construirQuery, request } from '@/services/api-client';
import type { Lista, Pagina } from '@/types/common';
import type {
  BuscarReservasParams,
  CheckInInput,
  CrearReservaInput,
  EstadoReserva,
  ListarReservasParams,
  Reserva,
} from '@/types/reserva';

/** `/reservas` endpoints (RF-014, RF-016, RF-017, RF-019, RF-021, RF-024). */

/** `POST /reservas` -> 201. 409 `RESERVA_BLOQUE_OCUPADO` when the bay is taken. */
export function crearReserva(input: CrearReservaInput): Promise<Reserva> {
  return request<Reserva>('/reservas', { method: 'POST', body: input });
}

/**
 * `GET /reservas?estado=&pagina=&tamanio=`. Clients only ever get their own
 * rows; staff and admins get every row. Sorted by `inicio DESC`.
 */
export function listarReservas(params: ListarReservasParams = {}): Promise<Pagina<Reserva>> {
  const query = construirQuery({
    estado: params.estado,
    pagina: params.pagina,
    tamanio: params.tamanio,
  });

  return request<Pagina<Reserva>>(`/reservas${query}`);
}

/** `GET /reservas/{id}`. */
export function obtenerReserva(id: number): Promise<Reserva> {
  return request<Reserva>(`/reservas/${id}`);
}

/**
 * `GET /reservas/buscar?codigo=&placa=`: today's and upcoming non-terminal
 * reservations. The backend answers 404 when nothing matches.
 */
export async function buscarReservas(params: BuscarReservasParams): Promise<Reserva[]> {
  const query = construirQuery({ codigo: params.codigo, placa: params.placa });
  const data = await request<Lista<Reserva>>(`/reservas/buscar${query}`);
  return data.items;
}

/** `POST /reservas/{id}/cancelacion`. 422 `TRANSICION_INVALIDA` once started. */
export function cancelarReserva(id: number, motivo: string): Promise<Reserva> {
  return request<Reserva>(`/reservas/${id}/cancelacion`, {
    method: 'POST',
    body: { motivo },
  });
}

/**
 * `POST /reservas/{id}/check-in`. A client more than 20 minutes late answers
 * 409 `RETRASO_REQUIERE_CONFIRMACION`; re-send with `confirmar_retraso: true`.
 */
export function checkIn(id: number, input: CheckInInput): Promise<Reserva> {
  return request<Reserva>(`/reservas/${id}/check-in`, { method: 'POST', body: input });
}

/**
 * `POST /reservas/{id}/estado`. Only pass a state listed in the reservation's
 * `transiciones_permitidas`; anything else answers 422 `TRANSICION_INVALIDA`.
 */
export function cambiarEstado(id: number, estado: EstadoReserva): Promise<Reserva> {
  return request<Reserva>(`/reservas/${id}/estado`, { method: 'POST', body: { estado } });
}

/** `POST /reservas/{id}/check-out`. 422 `PAGO_PENDIENTE` without a payment. */
export function checkOut(id: number, conformidadCliente: boolean): Promise<Reserva> {
  return request<Reserva>(`/reservas/${id}/check-out`, {
    method: 'POST',
    body: { conformidad_cliente: conformidadCliente },
  });
}
