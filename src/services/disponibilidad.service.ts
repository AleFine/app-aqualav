import { construirQuery, request } from '@/services/api-client';
import type { Disponibilidad } from '@/types/disponibilidad';

/** `/disponibilidad` endpoint (RF-013). */

/**
 * `GET /disponibilidad?fecha=&servicio_id=`.
 *
 * @param fecha `YYYY-MM-DD` in America/Lima.
 */
export function obtenerDisponibilidad(
  fecha: string,
  servicioId: number
): Promise<Disponibilidad> {
  const query = construirQuery({ fecha, servicio_id: servicioId });
  return request<Disponibilidad>(`/disponibilidad${query}`);
}
