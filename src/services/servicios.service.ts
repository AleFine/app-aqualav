import { request } from '@/services/api-client';
import type { Lista } from '@/types/common';
import type { Servicio, ServicioActualizarInput, ServicioInput } from '@/types/servicio';

/** `/servicios` and `/admin/servicios` endpoints (RF-009, RF-010). */

/** `GET /servicios`: public catalog, active services only. */
export async function listarServicios(): Promise<Servicio[]> {
  const data = await request<Lista<Servicio>>('/servicios');
  return data.items;
}

/** `GET /servicios/{id}`. */
export function obtenerServicio(id: number): Promise<Servicio> {
  return request<Servicio>(`/servicios/${id}`);
}

/** `GET /admin/servicios`: includes inactive services. */
export async function listarServiciosAdmin(): Promise<Servicio[]> {
  const data = await request<Lista<Servicio>>('/admin/servicios');
  return data.items;
}

/** `POST /admin/servicios` -> 201. */
export function crearServicio(input: ServicioInput): Promise<Servicio> {
  return request<Servicio>('/admin/servicios', { method: 'POST', body: input });
}

/** `PATCH /admin/servicios/{id}`: any subset of the create fields plus `activo`. */
export function actualizarServicio(
  id: number,
  input: ServicioActualizarInput
): Promise<Servicio> {
  return request<Servicio>(`/admin/servicios/${id}`, { method: 'PATCH', body: input });
}
