import { useCallback, useEffect, useState } from 'react';

type AsyncState<T> = {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
};

const INITIAL_STATE = { data: null, error: null, isLoading: true } as const;

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * Minimal data-fetching hook so screens stay declarative.
 *
 * `fetcher` must be a stable reference: define it at module scope or wrap it in
 * `useCallback`, otherwise the request runs on every render.
 *
 * For real projects prefer TanStack Query or SWR.
 */
export function useAsync<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>(INITIAL_STATE);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setState(INITIAL_STATE);
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetcher()
      .then((data) => {
        if (!cancelled) {
          setState({ data, error: null, isLoading: false });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ data: null, error: toError(error), isLoading: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetcher, reloadToken]);

  return { ...state, reload };
}
