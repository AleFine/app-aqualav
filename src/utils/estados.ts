import type { NombreIcono } from '@/components/ui/icon';
import type { ThemeColor } from '@/constants/theme';
import type { EstadoCatalogo } from '@/types/estado';
import type { MedioPago } from '@/types/pago';
import type { EstadoConocido, EstadoReserva } from '@/types/reserva';
import type { TipoVehiculo } from '@/types/vehiculo';

/**
 * Etiquetas, colores e iconos de los enumerados de la API. La API es la
 * autoridad sobre que transiciones existen; este modulo solo las nombra y les
 * asigna un token del sistema de disenio.
 *
 * Regla de accesibilidad: el color nunca es la unica senial. Por eso cada
 * estado tiene ademas un icono, y las vistas los muestran juntos.
 */

/** Objeto plano de tema, tal como lo devuelve `useTheme()`. */
type Tema = Record<ThemeColor, string>;

/** Exhaustivo sobre los estados que conoce este build: agregar uno se verifica en compilacion. */
const ETIQUETAS_CONOCIDAS: Record<EstadoConocido, string> = {
  confirmada: 'Confirmada',
  en_atencion: 'En atención',
  finalizado: 'Finalizado',
  entregado: 'Entregado',
  cancelada: 'Cancelada',
};

/** Vista ensanchada para buscar por un estado que puede no estar en el conjunto conocido. */
export const ETIQUETA_ESTADO: Record<string, string> = ETIQUETAS_CONOCIDAS;

/**
 * Etiqueta legible de un estado, incluso de uno que este build nunca vio. Un
 * estado agregado a `transicion_estado` despues de publicar este build sigue
 * mostrandose de forma legible ("en_revision" -> "En revision" gana a una
 * pastilla vacia).
 */
export function etiquetaEstado(estado: EstadoReserva): string {
  const conocida = ETIQUETAS_CONOCIDAS[estado as EstadoConocido];
  if (conocida) return conocida;

  const texto = String(estado).replace(/_/g, ' ').trim();
  if (!texto) return 'Desconocido';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Flujo principal de la maquina de estados, en orden, tal como la API lo deriva
 * de `transicion_estado` (los estados que marca `principal`). `cancelada` no
 * forma parte de el: es una rama de excepcion que la linea de tiempo agrega
 * solo cuando ocurrio de verdad.
 *
 * Vive en una cache a nivel de modulo y no en un hook porque `LineaTiempo` lo
 * lee en lo profundo de las pantallas de detalle. `CatalogoEstadosProvider` lo
 * llena una vez por sesion; hasta entonces se sirve el flujo de compilacion, de
 * modo que la linea de tiempo se dibuja bien en el primer cuadro y sin red.
 */
const FLUJO_DE_RESPALDO: readonly EstadoReserva[] = [
  'confirmada',
  'en_atencion',
  'finalizado',
  'entregado',
];

let flujoPrincipal: readonly EstadoReserva[] = FLUJO_DE_RESPALDO;

/** Reemplaza el flujo de compilacion por el que acaba de reportar la API. */
export function recordarCatalogoEstados(catalogo: readonly EstadoCatalogo[]): void {
  const principales = catalogo
    .filter((estado) => estado.principal)
    .sort((a, b) => a.orden - b.orden)
    .map((estado) => estado.codigo);

  // Un flujo principal vacio borraria la linea de tiempo; se conserva el anterior.
  if (principales.length > 0) {
    flujoPrincipal = principales;
  }
}

/** El flujo principal conocido en este momento, en orden. */
export function ordenEstados(): readonly EstadoReserva[] {
  return flujoPrincipal;
}

/**
 * Color de acento de un estado, resuelto contra el tema activo.
 *
 * Los estados usan tokens semanticos, no la rampa de marca: `confirmada` es
 * informacion, `en_atencion` es la unica etapa con color de marca (es la que
 * esta ocurriendo), `finalizado` es exito y `cancelada` es peligro.
 */
export function COLOR_ESTADO(estado: EstadoReserva, theme: Tema): string {
  switch (estado) {
    case 'confirmada':
      return theme.info;
    case 'en_atencion':
      return theme.brand;
    case 'finalizado':
      return theme.success;
    case 'entregado':
      return theme.textSecondary;
    case 'cancelada':
      return theme.danger;
    default:
      // Un estado agregado como dato despues de este build: neutro, nunca indefinido.
      return theme.textMuted;
  }
}

/**
 * Icono de un estado. Acompania siempre a `COLOR_ESTADO` para que la lectura no
 * dependa de distinguir colores.
 */
export function ICONO_ESTADO(estado: EstadoReserva): NombreIcono {
  switch (estado) {
    case 'confirmada':
      return 'fecha';
    case 'en_atencion':
      return 'servicios';
    case 'finalizado':
      return 'exito';
    case 'entregado':
      return 'confirmar';
    case 'cancelada':
      return 'bloqueado';
    default:
      return 'info';
  }
}

export const ETIQUETA_MEDIO_PAGO: Record<MedioPago, string> = {
  efectivo: 'Efectivo',
  tarjeta_pos: 'Tarjeta (POS)',
  transferencia: 'Transferencia',
};

export const ICONO_MEDIO_PAGO: Record<MedioPago, NombreIcono> = {
  efectivo: 'efectivo',
  tarjeta_pos: 'tarjeta',
  transferencia: 'pago',
};

export const ETIQUETA_TIPO_VEHICULO: Record<TipoVehiculo, string> = {
  sedan: 'Sedán',
  suv: 'SUV',
  camioneta: 'Camioneta',
  motocicleta: 'Motocicleta',
};

export const ICONO_TIPO_VEHICULO: Record<TipoVehiculo, NombreIcono> = {
  sedan: 'sedan',
  suv: 'suv',
  camioneta: 'camioneta',
  motocicleta: 'motocicleta',
};
