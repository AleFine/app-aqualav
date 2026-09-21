/**
 * Respuesta tactil compartida por todas las superficies presionables.
 *
 * Centraliza tres cosas que la guia de Apple y Material piden y que antes
 * estaban sueltas o ausentes:
 * 1. Retroalimentacion visual en menos de 100 ms.
 * 2. Un unico ritmo de resorte para toda la app (`Motion.spring.firme`).
 * 3. Respeto por "reducir movimiento": si esta activo, la escala no se anima.
 *
 * La escala no altera el area tactil ni desplaza el contenido vecino, por lo
 * que no provoca saltos de layout.
 */

import { useCallback } from 'react';

import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Motion } from '@/constants/theme';
import { toque } from '@/utils/haptica';

export type OpcionesPresion = {
  /** Escala al presionar. Por defecto `Motion.pressScale`. */
  escala?: number;
  /** Emitir un golpe haptico al presionar. Por defecto `true`. */
  haptica?: boolean;
  /** Desactiva la respuesta (control inhabilitado o en carga). */
  inhabilitado?: boolean;
};

export function usePresion({
  escala = Motion.pressScale,
  haptica = true,
  inhabilitado = false,
}: OpcionesPresion = {}) {
  const progreso = useSharedValue(1);
  const movimientoReducido = useReducedMotion();

  const alPresionar = useCallback(() => {
    if (inhabilitado) return;
    if (haptica) toque();
    if (movimientoReducido) return;
    progreso.value = withSpring(escala, Motion.spring.firme);
  }, [escala, haptica, inhabilitado, movimientoReducido, progreso]);

  const alSoltar = useCallback(() => {
    if (inhabilitado || movimientoReducido) return;
    progreso.value = withSpring(1, Motion.spring.firme);
  }, [inhabilitado, movimientoReducido, progreso]);

  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scale: progreso.value }],
  }));

  return { estiloAnimado, alPresionar, alSoltar };
}
