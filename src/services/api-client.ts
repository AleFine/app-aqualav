import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { DetalleError } from '@/types/common';

/**
 * HTTP client for the AquaLav FastAPI backend.
 *
 * The base URL comes from `EXPO_PUBLIC_API_URL` when defined (see
 * `.env.example`). Otherwise it is inferred from the host serving the Metro
 * bundle, which is the IP of the development machine as seen from the emulator
 * or the phone; on web and on the iOS simulator that host is `localhost`.
 * Remember to start uvicorn with `--host 0.0.0.0`.
 *
 * Every path is resolved against `${API_URL}/api/v1`, so callers pass
 * `/reservas`, never `/api/v1/reservas`.
 */

const API_PORT = 8000;

/** Every resource of the backend lives under this prefix. */
const API_PREFIX = '/api/v1';

/**
 * Without this, an unreachable server (uvicorn listening only on `127.0.0.1`,
 * or a firewall blocking the port) would leave `fetch` hanging forever: the
 * button keeps spinning and no error is ever raised.
 */
const REQUEST_TIMEOUT_MS = 15000;

function inferHost(): string {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];

  if (host) {
    return host;
  }

  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? `http://${inferHost()}:${API_PORT}`;

/** Error code reported when the backend body carries no `codigo`. */
export const CODIGO_DESCONOCIDO = 'DESCONOCIDO';

/** Error code used for the network sentinel (`status === 0`). */
export const CODIGO_RED = 'SIN_CONEXION';

/**
 * Every 4xx/5xx of the backend is mapped to this error. `status === 0` is the
 * network sentinel: the request never reached the server.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly detalles: DetalleError[];

  constructor(
    message: string,
    status: number,
    codigo: string = CODIGO_DESCONOCIDO,
    detalles: DetalleError[] = []
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }

  /** Message attached to `campo`, when the backend reported a field error. */
  detalleDe(campo: string): string | null {
    return this.detalles.find((detalle) => detalle.campo === campo)?.mensaje ?? null;
  }
}

export type MetodoHttp = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type RequestOptions = {
  method?: MetodoHttp;
  /** JSON body. */
  body?: unknown;
  /** Extra headers, e.g. `Idempotency-Key`. */
  headers?: Record<string, string>;
  /**
   * Set to `false` for the public `/auth/*` endpoints so the request carries no
   * bearer token and never triggers the refresh dance.
   */
  autenticar?: boolean;
};

/**
 * Callbacks the session layer injects so `request` can attach the bearer token
 * and recover from an expired access token on its own.
 */
export type SesionHttp = {
  /** Current access token, or `null` when there is no session. */
  obtenerToken: () => string | null;
  /** Exchanges the refresh token; resolves to the new access token or `null`. */
  refrescar: () => Promise<string | null>;
  /** Called when the session cannot be recovered. Wired to sign-out. */
  alExpirar: () => void;
};

let sesion: SesionHttp | null = null;

/** Injects (or clears, with `null`) the session callbacks. */
export function configurarSesion(config: SesionHttp | null): void {
  sesion = config;
}

/**
 * Single in-flight refresh: several parallel 401s share one call to
 * `/auth/refresh` instead of racing each other.
 */
let refrescoEnCurso: Promise<string | null> | null = null;

function refrescarUnaVez(): Promise<string | null> {
  if (!sesion) {
    return Promise.resolve(null);
  }

  if (!refrescoEnCurso) {
    refrescoEnCurso = sesion
      .refrescar()
      .catch(() => null)
      .finally(() => {
        refrescoEnCurso = null;
      });
  }

  return refrescoEnCurso;
}

/** Traces in the Metro console; does nothing in production. */
function log(message: string, ...details: unknown[]): void {
  if (__DEV__) {
    console.log(`[api] ${message}`, ...details);
  }
}

type Respuesta = {
  status: number;
  ok: boolean;
  payload: unknown;
};

/** Uniform error body of the backend. */
type CuerpoError = {
  error?: {
    codigo?: unknown;
    mensaje?: unknown;
    detalles?: unknown;
  };
};

function leerDetalles(valor: unknown): DetalleError[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.flatMap((item) => {
    if (typeof item !== 'object' || item === null || !('mensaje' in item)) {
      return [];
    }

    const { campo, mensaje } = item as { campo?: unknown; mensaje: unknown };

    return [
      {
        campo: typeof campo === 'string' ? campo : undefined,
        mensaje: String(mensaje),
      },
    ];
  });
}

/** Fallback for FastAPI's raw `detail` shape (string or validation list). */
function leerDetail(payload: unknown, fallback: string): string {
  if (typeof payload !== 'object' || payload === null || !('detail' in payload)) {
    return fallback;
  }

  const { detail } = payload as { detail: unknown };

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (typeof item === 'object' && item && 'msg' in item ? String(item.msg) : null))
      .filter((message): message is string => !!message);

    if (messages.length > 0) {
      return messages.join('\n');
    }
  }

  return fallback;
}

/**
 * Maps a failed response to `ApiError`, preferring the uniform
 * `{"error": {"codigo", "mensaje", "detalles"}}` body of the backend.
 */
function aApiError(respuesta: Respuesta): ApiError {
  const fallback = `Error ${respuesta.status}`;
  const cuerpo = respuesta.payload as CuerpoError | null;
  const error = typeof cuerpo === 'object' && cuerpo !== null ? cuerpo.error : undefined;

  if (error && typeof error === 'object') {
    return new ApiError(
      typeof error.mensaje === 'string' ? error.mensaje : fallback,
      respuesta.status,
      typeof error.codigo === 'string' ? error.codigo : CODIGO_DESCONOCIDO,
      leerDetalles(error.detalles)
    );
  }

  return new ApiError(leerDetail(respuesta.payload, fallback), respuesta.status);
}

async function enviar(
  path: string,
  options: Required<Pick<RequestOptions, 'method'>> & RequestOptions,
  token: string | null
): Promise<Respuesta> {
  const { method, body, headers: extraHeaders } = options;

  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${API_URL}${API_PREFIX}${path}`;
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  log(`→ ${method} ${url}`);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const elapsed = Date.now() - startedAt;

    if (controller.signal.aborted) {
      log(`✗ ${method} ${path} sin respuesta tras ${elapsed} ms`);
      throw new ApiError(
        `El servidor no respondió (${API_URL}). Comprueba que uvicorn corra con --host 0.0.0.0 y que el firewall permita el puerto ${API_PORT}.`,
        0,
        CODIGO_RED
      );
    }

    log(`✗ ${method} ${path} falló tras ${elapsed} ms`, error);
    throw new ApiError(`No se pudo conectar con el servidor (${API_URL})`, 0, CODIGO_RED);
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  log(`← ${response.status} ${method} ${path} (${Date.now() - startedAt} ms)`);

  return { status: response.status, ok: response.ok, payload };
}

/**
 * Performs one request against `/api/v1`. On a 401 with an access token in
 * place it refreshes the session ONCE, retries, and gives up through
 * `alExpirar()` if the retry still fails.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', autenticar = true, ...rest } = options;
  const opciones = { method, ...rest };

  const tokenInicial = autenticar ? (sesion?.obtenerToken() ?? null) : null;
  let respuesta = await enviar(path, opciones, tokenInicial);

  if (respuesta.status === 401 && tokenInicial && sesion) {
    const tokenNuevo = await refrescarUnaVez();

    if (!tokenNuevo) {
      sesion.alExpirar();
      throw aApiError(respuesta);
    }

    respuesta = await enviar(path, opciones, tokenNuevo);

    if (respuesta.status === 401) {
      sesion.alExpirar();
    }
  }

  if (!respuesta.ok) {
    throw aApiError(respuesta);
  }

  return respuesta.payload as T;
}

/** Builds a query string, skipping `undefined` and empty values. */
export function construirQuery(params: Record<string, string | number | undefined>): string {
  const pares = Object.entries(params)
    .filter(([, valor]) => valor !== undefined && valor !== '')
    .map(([clave, valor]) => `${encodeURIComponent(clave)}=${encodeURIComponent(String(valor))}`);

  return pares.length > 0 ? `?${pares.join('&')}` : '';
}
