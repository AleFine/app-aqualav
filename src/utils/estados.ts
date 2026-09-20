import type { ThemeColor } from '@/constants/theme';
import type { EstadoCatalogo } from '@/types/estado';
import type { MedioPago } from '@/types/pago';
import type { EstadoConocido, EstadoReserva } from '@/types/reserva';
import type { TipoVehiculo } from '@/types/vehiculo';

/**
 * Spanish display labels and colors for the enum values of the API. The API is
 * the authority on which transitions exist; this module only names them.
 */

/** A flat theme object as returned by `useTheme()`. */
type Tema = Record<ThemeColor, string>;

/** Exhaustive over the states this build knows: adding one here is compile-checked. */
const ETIQUETAS_CONOCIDAS: Record<EstadoConocido, string> = {
  confirmada: 'Confirmada',
  en_atencion: 'En atención',
  finalizado: 'Finalizado',
  entregado: 'Entregado',
  cancelada: 'Cancelada',
};

/** Widened view for lookups by a state that may not be in the known set. */
export const ETIQUETA_ESTADO: Record<string, string> = ETIQUETAS_CONOCIDAS;

/**
 * Human label of a state, including one this build has never seen. A state added
 * to `transicion_estado` after this build shipped still renders readably
 * ("en_revision" -> "En revisión" is not possible without the accent, but
 * "En revision" beats a blank pill).
 */
export function etiquetaEstado(estado: EstadoReserva): string {
  const conocida = ETIQUETAS_CONOCIDAS[estado as EstadoConocido];
  if (conocida) return conocida;

  const texto = String(estado).replace(/_/g, ' ').trim();
  if (!texto) return 'Desconocido';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Main flow of the state machine, in order, as the API derives it from
 * `transicion_estado` (the states it marks `principal`). `cancelada` is not
 * part of it: it is an exception branch the timeline appends only when it
 * actually happened.
 *
 * It lives in a module-level cache rather than in a hook because `LineaTiempo`
 * reads it deep inside the detail screens. `CatalogoEstadosProvider` fills it
 * once per session; until then the build-time flow below is served, so the
 * timeline renders correctly on the very first frame and offline.
 */
const FLUJO_DE_RESPALDO: readonly EstadoReserva[] = [
  'confirmada',
  'en_atencion',
  'finalizado',
  'entregado',
];

let flujoPrincipal: readonly EstadoReserva[] = FLUJO_DE_RESPALDO;

/** Replaces the build-time flow with the one the API just reported. */
export function recordarCatalogoEstados(catalogo: readonly EstadoCatalogo[]): void {
  const principales = catalogo
    .filter((estado) => estado.principal)
    .sort((a, b) => a.orden - b.orden)
    .map((estado) => estado.codigo);

  // An empty main flow would erase the timeline; keep what we had.
  if (principales.length > 0) {
    flujoPrincipal = principales;
  }
}

/** The main flow currently known, in order. */
export function ordenEstados(): readonly EstadoReserva[] {
  return flujoPrincipal;
}

/** Accent color of a state, resolved against the active theme. */
export function COLOR_ESTADO(estado: EstadoReserva, theme: Tema): string {
  switch (estado) {
    case 'confirmada':
      return theme.tint;
    case 'en_atencion':
      return theme.accent;
    case 'finalizado':
      return theme.text;
    case 'entregado':
      return theme.textSecondary;
    case 'cancelada':
      return theme.danger;
    default:
      // A state added as data after this build shipped: neutral, never undefined.
      return theme.textSecondary;
  }
}

export const ETIQUETA_MEDIO_PAGO: Record<MedioPago, string> = {
  efectivo: 'Efectivo',
  tarjeta_pos: 'Tarjeta (POS)',
  transferencia: 'Transferencia',
};

export const ETIQUETA_TIPO_VEHICULO: Record<TipoVehiculo, string> = {
  sedan: 'Sedán',
  suv: 'SUV',
  camioneta: 'Camioneta',
  motocicleta: 'Motocicleta',
};
