/**
 * Fondo atmosferico de AquaLav.
 *
 * Antes este archivo apilaba 24 `View` con el hex interpolado a mano, asi que
 * el degradado tenia bandas visibles. Ahora usa `expo-linear-gradient` para la
 * base y `react-native-svg` para las causticas: dos charcos de luz radiales que
 * imitan el sol atravesando el agua.
 *
 * Es el unico punto de la app donde se dibuja la identidad de marca. Cambiar
 * aqui cambia el caracter de todas las pantallas de acceso y cabeceras.
 */

import { memo } from 'react';
import { StyleSheet, View, useWindowDimensions, type ViewProps } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { conAlfa } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type GradientBackgroundProps = ViewProps & {
  /**
   * Intensidad de las causticas.
   * - `plena`: pantallas de acceso, donde el fondo es el protagonista.
   * - `sutil`: cabeceras dentro de la app, donde el contenido manda.
   */
  intensidad?: 'plena' | 'sutil';
};

/** Capa de luz: dos elipses radiales que se funden con el degradado base. */
const Causticas = memo(function Causticas({
  ancho,
  alto,
  color,
  opacidad,
}: {
  ancho: number;
  alto: number;
  color: string;
  opacidad: number;
}) {
  return (
    <Svg width={ancho} height={alto} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="charcoSuperior" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacidad} />
          <Stop offset="0.55" stopColor={color} stopOpacity={opacidad * 0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="charcoInferior" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacidad * 0.72} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Charco principal: arriba a la derecha, fuera de encuadre a proposito. */}
      <Ellipse
        cx={ancho * 0.86}
        cy={alto * 0.14}
        rx={ancho * 0.72}
        ry={alto * 0.3}
        fill="url(#charcoSuperior)"
      />
      {/* Contraluz inferior: da profundidad sin competir con el contenido. */}
      <Ellipse
        cx={ancho * 0.08}
        cy={alto * 0.88}
        rx={ancho * 0.66}
        ry={alto * 0.26}
        fill="url(#charcoInferior)"
      />
    </Svg>
  );
});

export function GradientBackground({
  children,
  style,
  intensidad = 'plena',
  ...rest
}: GradientBackgroundProps) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();

  const opacidad = intensidad === 'plena' ? 0.5 : 0.26;

  return (
    <View style={[styles.contenedor, style]} {...rest}>
      <LinearGradient
        colors={[theme.gradientStart, theme.gradientMid, theme.gradientEnd]}
        /* Diagonal: el agua nunca se ilumina en linea recta. */
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        /* El azul profundo ocupa la mitad superior; el celeste solo remata. */
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* `pointerEvents` va en el estilo: como prop quedo deprecado en RN 0.70. */}
      <View style={styles.capaInerte}>
        <Causticas
          ancho={width}
          alto={height}
          color={theme.onGradient}
          opacidad={opacidad}
        />
      </View>

      {/* Velo inferior: asienta el contenido y evita que el celeste deslumbre. */}
      <LinearGradient
        colors={['transparent', conAlfa(theme.gradientStart, 0.45)]}
        start={{ x: 0.5, y: 0.45 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.capaInerte}
      />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    overflow: 'hidden',
  },
  /** Capa decorativa: nunca intercepta el tacto. */
  capaInerte: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
});
