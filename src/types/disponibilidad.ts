/** Availability domain: mirrors `GET /disponibilidad` (RF-013). */

export type BloqueDisponible = {
  /** ISO-8601 with the America/Lima offset. */
  inicio: string;
  fin: string;
  bahias_libres: number;
};

export type Disponibilidad = {
  /** `YYYY-MM-DD` in America/Lima. */
  fecha: string;
  /** False on a non-working day (RN-07); `bloques` is then empty. */
  laborable: boolean;
  servicio_id: number;
  duracion_min: number;
  bloques: BloqueDisponible[];
  /** Filled only when no block is free for `fecha` (RF-013 flow 3a). */
  siguiente_fecha_disponible: string | null;
};
