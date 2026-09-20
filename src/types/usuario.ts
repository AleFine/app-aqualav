/** Identity domain: mirrors `UsuarioOut` and the login payload of the API. */

export type RolNombre = 'cliente' | 'personal' | 'administrador';

/**
 * The 13 permission codes seeded by the backend. Screens gate their UI with
 * `useAuth().tiene(permiso)`; they never compare role names.
 */
export type Permiso =
  | 'vehiculo:leer'
  | 'vehiculo:crear'
  | 'servicio:leer'
  | 'servicio:administrar'
  | 'disponibilidad:leer'
  | 'reserva:crear'
  | 'reserva:leer_propias'
  | 'reserva:leer_todas'
  | 'reserva:cancelar'
  | 'reserva:check_in'
  | 'reserva:avanzar_estado'
  | 'reserva:check_out'
  | 'pago:registrar';

/** `UsuarioOut`. The password hash is never exposed by the API. */
export type Usuario = {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  rol: RolNombre;
  estado_cuenta: string;
  creado_en: string;
};

/** Response of `POST /auth/login` and `POST /auth/refresh`. */
export type SesionAuth = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  /** Access token lifetime in seconds (1800 = 30 min). */
  expires_in: number;
  usuario: Usuario;
  permisos: Permiso[];
};

/** Body of `POST /auth/registro`. */
export type RegistroInput = {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  password: string;
  acepta_politica: boolean;
};
