import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';

/**
 * Aviso flotante equivalente al `Toast` de Android: aparece sobre la pantalla y
 * se oculta solo. El estado vive en `useToast()`.
 */

type ToastProps = {
  message: string | null;
  onHide: () => void;
  tone?: 'neutral' | 'error';
  durationMs?: number;
};

const FADE_DURATION = 180;

export function Toast({ message, onHide, tone = 'neutral', durationMs = 2600 }: ToastProps) {
  // `Animated.Value` es un objeto mutable estable: un inicializador perezoso de
  // `useState` evita crearlo en cada render sin tocar un ref durante el render.
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!message) {
      return;
    }

    let hideTimeout: ReturnType<typeof setTimeout>;

    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_DURATION,
      useNativeDriver: true,
    }).start(() => {
      hideTimeout = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }).start(onHide);
      }, durationMs);
    });

    return () => {
      clearTimeout(hideTimeout);
      opacity.stopAnimation();
      opacity.setValue(0);
    };
  }, [durationMs, message, onHide, opacity]);

  if (!message) {
    return null;
  }

  return (
    <Animated.View
      accessibilityRole="alert"
      pointerEvents="none"
      style={[
        styles.toast,
        tone === 'error' ? styles.toastError : styles.toastNeutral,
        { opacity },
      ]}>
      <ThemedText type="smallBold" style={styles.text}>
        {message}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: Spacing.five,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.full,
    alignItems: 'center',
  },
  toastNeutral: {
    backgroundColor: 'rgba(23, 25, 31, 0.94)',
  },
  toastError: {
    backgroundColor: 'rgba(158, 26, 20, 0.96)',
  },
  text: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
