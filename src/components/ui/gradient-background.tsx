import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * Fondo degradado a pantalla completa, equivalente al `layer-list` que servía de
 * `android:background` en el login original.
 *
 * Se dibuja apilando franjas de color interpoladas para no depender de
 * `expo-linear-gradient`. Si más adelante añades esa librería, este componente es
 * el único archivo que hay que cambiar.
 */

const BAND_COUNT = 24;

function parseHex(color: string): [number, number, number] {
  const hex = color.replace('#', '');
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

function mix(from: string, to: string, ratio: number): string {
  const [r1, g1, b1] = parseHex(from);
  const [r2, g2, b2] = parseHex(to);
  const channel = (a: number, b: number) => Math.round(a + (b - a) * ratio);
  return `rgb(${channel(r1, r2)}, ${channel(g1, g2)}, ${channel(b1, b2)})`;
}

export function GradientBackground({ style, children, ...rest }: ViewProps) {
  const theme = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.gradientStart }, style]} {...rest}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: BAND_COUNT }, (_, index) => (
          <View
            key={index}
            style={[
              styles.band,
              {
                backgroundColor: mix(
                  theme.gradientStart,
                  theme.gradientEnd,
                  index / (BAND_COUNT - 1)
                ),
              },
            ]}
          />
        ))}
        <View style={[styles.blob, styles.blobTop]} />
        <View style={[styles.blob, styles.blobBottom]} />
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  band: {
    flex: 1,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  blobTop: {
    width: 280,
    height: 280,
    top: -110,
    right: -80,
  },
  blobBottom: {
    width: 220,
    height: 220,
    bottom: -70,
    left: -60,
  },
});
