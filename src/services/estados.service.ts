import { request } from '@/services/api-client';
import type { Lista } from '@/types/common';
import type { EstadoCatalogo } from '@/types/estado';

/** `/estados` endpoint (EXTENSION POINT P3). */

/**
 * `GET /estados`: every state declared in `transicion_estado`, in display
 * order. Authenticated but not permission gated; all three roles need it.
 */
export async function listarEstados(): Promise<EstadoCatalogo[]> {
  const data = await request<Lista<EstadoCatalogo>>('/estados');
  return data.items;
}
