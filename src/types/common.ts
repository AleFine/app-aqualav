/**
 * Shapes shared by every domain module. They mirror the backend JSON exactly:
 * Spanish snake_case field names, no client-side renaming.
 */

/** Money is always an object of integer cents plus its ISO currency code. */
export type Dinero = {
  monto_centimos: number;
  moneda: string;
};

/** One entry of the uniform error body's `detalles` array. */
export type DetalleError = {
  campo?: string;
  mensaje: string;
};

/** Envelope of every paginated collection (`GET /reservas`). */
export type Pagina<T> = {
  items: T[];
  pagina: number;
  tamanio: number;
  total: number;
  total_paginas: number;
};

/** Envelope of every non-paginated collection (`{"items": [...]}`). */
export type Lista<T> = {
  items: T[];
};
