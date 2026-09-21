/**
 * Texto tematizado. Es el unico componente de tipografia de la app.
 *
 * Los estilos salen de `Typography` en lugar de declararse aqui, para que la
 * escala viva en un solo archivo. Los nombres de `type` historicos se conservan
 * y se remapean a la escala nueva, asi ninguna pantalla necesita cambiar.
 *
 * Detalle importante: con fuentes propias, Android ignora `fontWeight`. Por eso
 * cada peso es una familia distinta (`FontFamily.bodySemiBold`, etc.) y aqui
 * nunca se combina `fontFamily` con `fontWeight`.
 */

import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, TabularNums, Typography, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TipoTexto =
  /* Escala nueva */
  | 'display'
  | 'heading'
  | 'bodyStrong'
  | 'caption'
  | 'overline'
  /* Escala historica, conservada por compatibilidad */
  | 'default'
  | 'title'
  | 'subtitle'
  | 'small'
  | 'smallBold'
  | 'link'
  | 'linkPrimary'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: TipoTexto;
  themeColor?: ThemeColor;
  /**
   * Cifras de ancho fijo. Obligatorio en precios, horarios y contadores:
   * evita que la fila salte cuando el valor cambia.
   */
  tabular?: boolean;
};

export function ThemedText({
  type = 'default',
  themeColor,
  tabular = false,
  style,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  /* `linkPrimary` ya no lleva un hex fijo: antes ignoraba el modo oscuro. */
  const colorPorDefecto: ThemeColor = type === 'linkPrimary' ? 'brand' : 'text';

  return (
    <Text
      style={[
        styles[type],
        { color: theme[themeColor ?? colorPorDefecto] },
        tabular && TabularNums,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  /* Escala nueva */
  display: Typography.display,
  heading: Typography.heading,
  bodyStrong: Typography.bodyStrong,
  caption: Typography.caption,
  overline: Typography.overline,

  /* Escala historica remapeada */
  default: Typography.body,
  /** Antes 48px: ilegible en una pantalla de 375. */
  title: Typography.title,
  subtitle: Typography.subtitle,
  small: Typography.label,
  smallBold: Typography.labelStrong,
  link: {
    ...Typography.label,
    textDecorationLine: 'underline',
  },
  linkPrimary: Typography.labelStrong,
  code: {
    ...Typography.caption,
    fontFamily: Fonts?.mono,
  },
});
