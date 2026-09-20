import { request } from '@/services/api-client';
import type { Lista } from '@/types/common';
import type { Vehiculo, VehiculoInput } from '@/types/vehiculo';

/** `/vehiculos` endpoints (RF-007). */

/** `GET /vehiculos`: only the caller's own vehicles. */
export async function listarVehiculos(): Promise<Vehiculo[]> {
  const data = await request<Lista<Vehiculo>>('/vehiculos');
  return data.items;
}

/** `POST /vehiculos` -> 201. 409 `PLACA_DUPLICADA`, 422 `PLACA_INVALIDA`. */
export function crearVehiculo(input: VehiculoInput): Promise<Vehiculo> {
  return request<Vehiculo>('/vehiculos', { method: 'POST', body: input });
}
