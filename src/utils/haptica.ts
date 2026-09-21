/**
 * Retroalimentacion haptica.
 *
 * Se centraliza aqui por dos motivos: en web `expo-haptics` no existe, y la
 * guia de Apple pide usar el motor con criterio. La regla de la app es:
 * - `toque`  -> el usuario presiono algo (boton, tarjeta, chip).
 * - `logro`  -> una operacion termino bien (reserva creada, pago registrado).
 * - `fallo`  -> una operacion fue rechazada (validacion, error del servidor).
 *
 * Nunca en scroll, ni en cada pulsacion de teclado: el exceso cansa.
 */

import { Platform } from 'react-native';

import * as Haptics from 'expo-haptics';

const soportado = Platform.OS === 'ios' || Platform.OS === 'android';

/** Golpe corto al presionar una superficie tactil. */
export function toque() {
  if (!soportado) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Golpe firme para una accion destacada o destructiva confirmada. */
export function toqueFirme() {
  if (!soportado) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Operacion completada con exito. */
export function logro() {
  if (!soportado) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Operacion rechazada o error de validacion. */
export function fallo() {
  if (!soportado) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/** Cambio de seleccion dentro de un grupo (chips, pestanias, fechas). */
export function seleccion() {
  if (!soportado) return;
  void Haptics.selectionAsync();
}
