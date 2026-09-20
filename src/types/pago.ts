/** Payment domain: mirrors `PagoOut` (RF-026). */

import type { Dinero } from '@/types/common';

export type MedioPago = 'efectivo' | 'tarjeta_pos' | 'transferencia';

export type Pago = {
  id: number;
  monto: Dinero;
  medio: MedioPago;
  /** `confirmado` in the MVP. */
  estado: string;
  registrado_en: string;
  /** Full name of the staff member who registered it. */
  autor: string | null;
};

/**
 * Body of `POST /reservas/{id}/pagos`. `motivo_diferencia` is required by the
 * backend when `monto_centimos` differs from the reservation amount.
 */
export type RegistrarPagoInput = {
  medio: MedioPago;
  monto_centimos: number;
  motivo_diferencia?: string | null;
};
