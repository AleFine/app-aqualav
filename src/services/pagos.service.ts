import { request } from '@/services/api-client';
import type { Pago, RegistrarPagoInput } from '@/types/pago';

/** `/reservas/{id}/pagos` endpoint (RF-026). */

/**
 * UUID v4 built on `Math.random`. `expo-crypto` is not a dependency of this
 * academic MVP, and the key only has to be unique per device, not
 * cryptographically strong.
 */
export function generarIdempotencyKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (caracter) => {
    const azar = (Math.random() * 16) | 0;
    const valor = caracter === 'x' ? azar : (azar & 0x3) | 0x8;
    return valor.toString(16);
  });
}

/**
 * `POST /reservas/{id}/pagos` -> 201, or 200 replaying an existing key.
 *
 * Generate the key ONCE per payment attempt (keep it in a `useRef`) and pass it
 * on every retry, otherwise a retry after a timeout creates a second payment.
 */
export function registrarPago(
  reservaId: number,
  input: RegistrarPagoInput,
  idempotencyKey: string = generarIdempotencyKey()
): Promise<Pago> {
  return request<Pago>(`/reservas/${reservaId}/pagos`, {
    method: 'POST',
    body: input,
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}
