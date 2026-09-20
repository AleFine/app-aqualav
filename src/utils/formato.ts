import type { Dinero } from '@/types/common';

/**
 * Display formatting. Every business rule is evaluated in America/Lima, so the
 * UI renders the ISO-8601 timestamps of the API in that same timezone instead
 * of the device one.
 */

const LOCALE = 'es-PE';
const ZONA = 'America/Lima';

const CENTIMOS_POR_UNIDAD = 100;

/** Symbols used by the manual fallback when `Intl` is unavailable. */
const SIMBOLOS: Record<string, string> = {
  PEN: 'S/',
  USD: '$',
};

/** `{monto_centimos: 2500, moneda: "PEN"}` -> `"S/ 25.00"`. */
export function formatearDinero(dinero: Dinero): string {
  const unidades = dinero.monto_centimos / CENTIMOS_POR_UNIDAD;

  try {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: dinero.moneda,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(unidades);
  } catch {
    const simbolo = SIMBOLOS[dinero.moneda] ?? dinero.moneda;
    return `${simbolo} ${unidades.toFixed(2)}`;
  }
}

/** ISO-8601 -> `"20/09/2026"`. */
export function formatearFecha(iso: string): string {
  return formatear(iso, {
    timeZone: ZONA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** ISO-8601 -> `"10:00"`. */
export function formatearHora(iso: string): string {
  return formatear(iso, {
    timeZone: ZONA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Two ISO-8601 timestamps -> `"10:00 - 10:45"`. */
export function formatearRangoHorario(inicio: string, fin: string): string {
  return `${formatearHora(inicio)} - ${formatearHora(fin)}`;
}

/** ISO-8601 -> `"domingo, 20 de septiembre de 2026"`. */
export function formatearFechaLarga(iso: string): string {
  return formatear(iso, {
    timeZone: ZONA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** `YYYY-MM-DD` in America/Lima, the shape `GET /disponibilidad` expects. */
export function aFechaIso(fecha: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);

  return partes;
}

function formatear(iso: string, opciones: Intl.DateTimeFormatOptions): string {
  const fecha = new Date(iso);

  if (Number.isNaN(fecha.getTime())) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat(LOCALE, opciones).format(fecha);
  } catch {
    return fecha.toISOString();
  }
}
