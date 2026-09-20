/** Service catalog domain: mirrors `ServicioOut` (RF-009, RF-010). */

import type { Dinero } from '@/types/common';

export type Servicio = {
  id: number;
  nombre: string;
  descripcion: string;
  categoria: string;
  /** Always a multiple of 15. */
  duracion_min: number;
  activo: boolean;
  /** Current price. An object, never a bare number. */
  precio: Dinero;
};

/** Body of `POST /admin/servicios`. */
export type ServicioInput = {
  nombre: string;
  descripcion: string;
  categoria: string;
  duracion_min: number;
  monto_centimos: number;
  moneda: string;
};

/**
 * Body of `PATCH /admin/servicios/{id}`: any subset of the create fields plus
 * `activo`. Changing `monto_centimos` opens a new price row server-side.
 */
export type ServicioActualizarInput = Partial<ServicioInput> & {
  activo?: boolean;
};
