import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { listarEstados } from '@/services/estados.service';
import type { EstadoCatalogo } from '@/types/estado';
import { recordarCatalogoEstados } from '@/utils/estados';

/**
 * The state catalogue, read once per session from `GET /estados`.
 *
 * Detail screens get their actions from `reserva.transiciones_permitidas`, so
 * they never needed this. AGGREGATE screens did: the staff board, the history
 * filters and the "upcoming" list each have to know the whole set of states,
 * and each used to enumerate the five of the MVP locally. A reservation in a
 * state added to `transicion_estado` afterwards simply vanished from them
 * (principle P3, RF-021 CA-03).
 *
 * The catalogue is reference data: it only moves on a data migration, so one
 * read per session is enough.
 */

/**
 * What this build knows, used until the API answers and if it never does.
 *
 * It is a FALLBACK, not the source of truth: with it the app degrades to the
 * five MVP states instead of rendering nothing, and the API's answer replaces
 * it as soon as it arrives.
 */
const CATALOGO_DE_RESPALDO: readonly EstadoCatalogo[] = [
  { codigo: 'confirmada', terminal: false, principal: true, orden: 0 },
  { codigo: 'en_atencion', terminal: false, principal: true, orden: 1 },
  { codigo: 'finalizado', terminal: false, principal: true, orden: 2 },
  { codigo: 'entregado', terminal: true, principal: true, orden: 3 },
  { codigo: 'cancelada', terminal: true, principal: false, orden: 4 },
];

export type CatalogoEstadosValue = {
  /** Every declared state, in display order. Never empty. */
  estados: readonly EstadoCatalogo[];
  /** States a service can still move away from, in display order. */
  activos: readonly EstadoCatalogo[];
  /** True while the first read is in flight; the fallback is served meanwhile. */
  isCargando: boolean;
  /** True when the catalogue on screen is the build-time fallback. */
  esRespaldo: boolean;
};

const CatalogoEstadosContext = createContext<CatalogoEstadosValue | null>(null);

function porOrden(a: EstadoCatalogo, b: EstadoCatalogo): number {
  return a.orden - b.orden;
}

export function CatalogoEstadosProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [estados, setEstados] = useState<readonly EstadoCatalogo[] | null>(null);
  const [intentoTerminado, setIntentoTerminado] = useState(false);

  useEffect(() => {
    // The endpoint is authenticated, so there is nothing to read before login.
    if (!isAuthenticated || estados) return;

    let cancelado = false;

    listarEstados()
      .then((items) => {
        if (cancelado || items.length === 0) return;
        setEstados(items);
        // The timeline reads its pending steps from a module-level cache,
        // because it is rendered deep inside the detail screens.
        recordarCatalogoEstados(items);
      })
      // A failed read is not worth a blocking error: the fallback keeps every
      // screen usable, and the next session tries again.
      .catch(() => undefined)
      .finally(() => {
        if (!cancelado) setIntentoTerminado(true);
      });

    return () => {
      cancelado = true;
    };
  }, [estados, isAuthenticated]);

  const valor = useMemo<CatalogoEstadosValue>(() => {
    const vigentes = [...(estados ?? CATALOGO_DE_RESPALDO)].sort(porOrden);

    return {
      estados: vigentes,
      activos: vigentes.filter((estado) => !estado.terminal),
      isCargando: isAuthenticated && estados === null && !intentoTerminado,
      esRespaldo: estados === null,
    };
  }, [estados, intentoTerminado, isAuthenticated]);

  return (
    <CatalogoEstadosContext.Provider value={valor}>{children}</CatalogoEstadosContext.Provider>
  );
}

export function useCatalogoEstados(): CatalogoEstadosValue {
  const valor = useContext(CatalogoEstadosContext);

  if (!valor) {
    throw new Error('useCatalogoEstados debe usarse dentro de <CatalogoEstadosProvider>');
  }

  return valor;
}
