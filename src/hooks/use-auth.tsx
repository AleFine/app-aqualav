import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import * as authService from '@/services/auth.service';
import { configurarSesion } from '@/services/api-client';
import type { Permiso, RegistroInput, RolNombre, SesionAuth, Usuario } from '@/types/usuario';

/**
 * Session of the app.
 *
 * Tokens live in `expo-secure-store`, so the session survives a cold start. On
 * boot the stored session is restored and `GET /auth/yo` re-hydrates the user;
 * `isCargando` stays true meanwhile so the root layout can show a splash
 * instead of flashing the login screen.
 *
 * Authorization is the backend's job. `tiene(permiso)` only decides which
 * controls are worth rendering; no screen ever compares role names to decide
 * what a user may do.
 */

const CLAVE_ACCESS = 'aqualav.access_token';
const CLAVE_REFRESH = 'aqualav.refresh_token';
/** Cached `usuario` + `permisos`, so `tiene()` works before `/auth/yo` answers. */
const CLAVE_PERFIL = 'aqualav.perfil';

type PerfilCache = {
  usuario: Usuario;
  permisos: Permiso[];
};

export type AuthContextValue = {
  sesion: SesionAuth | null;
  usuario: Usuario | null;
  permisos: Permiso[];
  rol: RolNombre | null;
  isAuthenticated: boolean;
  /** True while the stored session is being restored on cold start. */
  isCargando: boolean;
  iniciarSesion: (correo: string, password: string) => Promise<void>;
  registrarse: (input: RegistroInput) => Promise<Usuario>;
  cerrarSesion: () => Promise<void>;
  tiene: (permiso: Permiso) => boolean;
  refrescarUsuario: () => Promise<void>;
};

const SIN_PERMISOS: Permiso[] = [];

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * `expo-secure-store` has no web implementation, and the app still has to run
 * in the browser during development. On web we fall back to `localStorage`,
 * which is enough for an academic project.
 */
const esWeb = Platform.OS === 'web';

async function leerClave(clave: string): Promise<string | null> {
  if (esWeb) {
    try {
      return globalThis.localStorage?.getItem(clave) ?? null;
    } catch {
      return null;
    }
  }

  return SecureStore.getItemAsync(clave);
}

async function escribirClave(clave: string, valor: string): Promise<void> {
  if (esWeb) {
    try {
      globalThis.localStorage?.setItem(clave, valor);
    } catch {
      // Private browsing blocks writes; the session simply will not persist.
    }
    return;
  }

  await SecureStore.setItemAsync(clave, valor);
}

async function borrarClave(clave: string): Promise<void> {
  if (esWeb) {
    try {
      globalThis.localStorage?.removeItem(clave);
    } catch {
      // Ignored for the same reason as above.
    }
    return;
  }

  await SecureStore.deleteItemAsync(clave);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<SesionAuth | null>(null);
  const [isCargando, setIsCargando] = useState(true);

  /**
   * The HTTP client reads the token through a callback, so it must always see
   * the latest value without waiting for a re-render.
   */
  const tokensRef = useRef<{ access: string | null; refresh: string | null }>({
    access: null,
    refresh: null,
  });

  const guardarSesion = useCallback(async (nueva: SesionAuth) => {
    tokensRef.current = { access: nueva.access_token, refresh: nueva.refresh_token };
    setSesion(nueva);

    const perfil: PerfilCache = { usuario: nueva.usuario, permisos: nueva.permisos };

    await Promise.all([
      escribirClave(CLAVE_ACCESS, nueva.access_token),
      escribirClave(CLAVE_REFRESH, nueva.refresh_token),
      escribirClave(CLAVE_PERFIL, JSON.stringify(perfil)),
    ]);
  }, []);

  const cerrarSesion = useCallback(async () => {
    tokensRef.current = { access: null, refresh: null };
    setSesion(null);

    await Promise.all([
      borrarClave(CLAVE_ACCESS),
      borrarClave(CLAVE_REFRESH),
      borrarClave(CLAVE_PERFIL),
    ]);
  }, []);

  const iniciarSesion = useCallback(
    async (correo: string, password: string) => {
      await guardarSesion(await authService.login(correo.trim(), password));
    },
    [guardarSesion]
  );

  const registrarse = useCallback((input: RegistroInput) => authService.registro(input), []);

  /** Re-reads `GET /auth/yo` after the profile may have changed server-side. */
  const refrescarUsuario = useCallback(async () => {
    const usuario = await authService.yo();

    setSesion((actual) => {
      if (!actual) {
        return actual;
      }

      const actualizada = { ...actual, usuario };
      const perfil: PerfilCache = { usuario, permisos: actual.permisos };
      void escribirClave(CLAVE_PERFIL, JSON.stringify(perfil));

      return actualizada;
    });
  }, []);

  useEffect(() => {
    let cancelado = false;

    // Injected before any request so the restore below already carries a token.
    configurarSesion({
      obtenerToken: () => tokensRef.current.access,
      refrescar: async () => {
        const refreshToken = tokensRef.current.refresh;

        if (!refreshToken) {
          return null;
        }

        try {
          const renovada = await authService.refresh(refreshToken);
          await guardarSesion(renovada);
          return renovada.access_token;
        } catch {
          return null;
        }
      },
      alExpirar: () => {
        void cerrarSesion();
      },
    });

    async function restaurar(): Promise<void> {
      const [access, refresh, perfilPlano] = await Promise.all([
        leerClave(CLAVE_ACCESS),
        leerClave(CLAVE_REFRESH),
        leerClave(CLAVE_PERFIL),
      ]);

      if (cancelado) {
        return;
      }

      if (!access || !refresh || !perfilPlano) {
        await cerrarSesion();
        if (!cancelado) {
          setIsCargando(false);
        }
        return;
      }

      let perfil: PerfilCache;
      try {
        perfil = JSON.parse(perfilPlano) as PerfilCache;
      } catch {
        await cerrarSesion();
        if (!cancelado) {
          setIsCargando(false);
        }
        return;
      }

      tokensRef.current = { access, refresh };
      setSesion({
        access_token: access,
        refresh_token: refresh,
        token_type: 'bearer',
        expires_in: 0,
        usuario: perfil.usuario,
        permisos: perfil.permisos,
      });

      try {
        // Re-hydrates the user; a 401 here is recovered by the client's single
        // refresh, and `alExpirar` signs out when even that fails.
        const usuario = await authService.yo();

        if (!cancelado) {
          setSesion((actual) => (actual ? { ...actual, usuario } : actual));
        }
      } catch {
        // The sign-out already happened through `alExpirar`.
      } finally {
        if (!cancelado) {
          setIsCargando(false);
        }
      }
    }

    void restaurar();

    return () => {
      cancelado = true;
      configurarSesion(null);
    };
  }, [cerrarSesion, guardarSesion]);

  const permisos = sesion?.permisos ?? SIN_PERMISOS;

  const tiene = useCallback(
    (permiso: Permiso) => permisos.includes(permiso),
    [permisos]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      sesion,
      usuario: sesion?.usuario ?? null,
      permisos,
      rol: sesion?.usuario.rol ?? null,
      isAuthenticated: !!sesion,
      isCargando,
      iniciarSesion,
      registrarse,
      cerrarSesion,
      tiene,
      refrescarUsuario,
    }),
    [
      cerrarSesion,
      iniciarSesion,
      isCargando,
      permisos,
      refrescarUsuario,
      registrarse,
      sesion,
      tiene,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }

  return context;
}
