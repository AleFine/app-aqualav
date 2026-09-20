/** Vehicle domain: mirrors `VehiculoOut` (RF-007). */

export type TipoVehiculo = 'sedan' | 'suv' | 'camioneta' | 'motocicleta';

export type Vehiculo = {
  id: number;
  placa: string;
  tipo: TipoVehiculo;
  marca: string;
  modelo: string;
  color: string;
  anio: number;
  activo: boolean;
};

/** Body of `POST /vehiculos`. */
export type VehiculoInput = {
  placa: string;
  tipo: TipoVehiculo;
  marca: string;
  modelo: string;
  color: string;
  anio: number;
};
