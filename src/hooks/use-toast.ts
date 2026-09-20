import { useCallback, useState } from 'react';

type ToastTone = 'neutral' | 'error';

type ToastState = {
  message: string;
  tone: ToastTone;
};

/** Estado de un `Toast`: `show()` lo muestra y el componente se oculta solo. */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((message: string, tone: ToastTone = 'neutral') => {
    setToast({ message, tone });
  }, []);

  const hide = useCallback(() => setToast(null), []);

  return { toast, show, hide };
}
