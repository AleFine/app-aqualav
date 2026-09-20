import { request } from '@/services/api-client';
import type { RegistroInput, SesionAuth, Usuario } from '@/types/usuario';

/** `/auth/*` endpoints (RF-001, RF-002). */

/** `POST /auth/registro` -> 201. 409 `CORREO_YA_REGISTRADO` when the email exists. */
export function registro(input: RegistroInput): Promise<Usuario> {
  return request<Usuario>('/auth/registro', {
    method: 'POST',
    body: input,
    autenticar: false,
  });
}

/** `POST /auth/login`. 401 `CREDENCIALES_INVALIDAS`, 429 `CUENTA_BLOQUEADA`. */
export function login(correo: string, password: string): Promise<SesionAuth> {
  return request<SesionAuth>('/auth/login', {
    method: 'POST',
    body: { correo, password },
    autenticar: false,
  });
}

/** `POST /auth/refresh`. Returns a brand new session, permissions included. */
export function refresh(refreshToken: string): Promise<SesionAuth> {
  return request<SesionAuth>('/auth/refresh', {
    method: 'POST',
    body: { refresh_token: refreshToken },
    autenticar: false,
  });
}

/** `GET /auth/yo`: the authenticated user behind the current access token. */
export function yo(): Promise<Usuario> {
  return request<Usuario>('/auth/yo');
}
