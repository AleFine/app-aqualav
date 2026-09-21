/**
 * Boton de AquaLav.
 *
 * El variante `primary` se dibuja con un degradado azul -> celeste: es la unica
 * accion luminosa de cada pantalla, y esa luminosidad es lo que la vuelve
 * inequivoca. Material y la guia de Apple coinciden en que debe haber una sola
 * accion primaria por pantalla; el resto usa `secondary` o `ghost`.
 *
 * Al presionar: escala + golpe haptico en menos de 100 ms. La escala se aplica
 * a una capa interna, por lo que el area tactil no se mueve.
 */

import { memo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Icon, type NombreIcono } from '@/components/ui/icon';
import { HitSize, Opacity, Radius, Spacing, conAlfa, elevacion } from '@/constants/theme';
import { usePresion } from '@/hooks/use-presion';
import { useTheme } from '@/hooks/use-theme';

export type VarianteBoton =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  /**
   * Accion primaria colocada SOBRE una superficie de marca (el heroe del
   * inicio, las pantallas de acceso). Invierte la relacion: superficie casi
   * blanca y rotulo azul profundo. Ambos colores son tokens, asi que el
   * contraste se mantiene alto en los dos esquemas; un boton `primary` ahi
   * competiria con el degradado de fondo.
   */
  | 'contraste';
export type TamanioBoton = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: VarianteBoton;
  size?: TamanioBoton;
  loading?: boolean;
  /** Icono que acompania al rotulo. Decorativo: el rotulo ya nombra la accion. */
  icon?: NombreIcono;
  iconPosition?: 'izquierda' | 'derecha';
  /** Ocupa todo el ancho disponible. */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Alturas por tamanio. Ninguna baja de 44: es el minimo tactil de Apple. */
const ALTURA: Record<TamanioBoton, number> = {
  sm: HitSize.min,
  md: 52,
  lg: 58,
};

const PADDING: Record<TamanioBoton, number> = {
  sm: Spacing.three,
  md: Spacing.four,
  lg: Spacing.four,
};

export const Button = memo(function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'izquierda',
  fullWidth = false,
  disabled,
  style,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const inactivo = Boolean(disabled) || loading;
  const { estiloAnimado, alPresionar, alSoltar } = usePresion({ inhabilitado: inactivo });

  const esPrimario = variant === 'primary';

  /* Color del rotulo y del icono por variante. */
  const colorRotulo =
    variant === 'primary'
      ? theme.onBrand
      : variant === 'danger'
        ? theme.onSemantic
        : variant === 'ghost'
          ? theme.brand
          : variant === 'contraste'
            ? theme.gradientStart
            : theme.text;

  /* Superficie por variante. `primary` la aporta el degradado. */
  const superficie: ViewStyle =
    variant === 'secondary'
      ? { backgroundColor: theme.surfaceSunken, borderWidth: 1, borderColor: theme.border }
      : variant === 'danger'
        ? { backgroundColor: theme.danger }
        : variant === 'ghost'
          ? { backgroundColor: 'transparent' }
          : variant === 'contraste'
            ? { backgroundColor: theme.onGradient }
            : {};

  /* Solo las acciones con peso proyectan sombra, y teñida de su propio color. */
  const sombra =
    esPrimario
      ? { boxShadow: `0px 6px 18px ${conAlfa(theme.brand, 0.34)}`, elevation: 6 }
      : variant === 'danger'
        ? { boxShadow: `0px 6px 18px ${conAlfa(theme.danger, 0.3)}`, elevation: 6 }
        : variant === 'contraste'
          ? { boxShadow: `0px 8px 22px ${conAlfa(theme.gradientStart, 0.45)}`, elevation: 8 }
          : elevacion(0, theme.shadow);

  const contenido = (
    <>
      {icon && iconPosition === 'izquierda' ? (
        <Icon name={icon} size={size === 'sm' ? 'sm' : 'md'} color={colorRotulo} />
      ) : null}

      <ThemedText
        type={size === 'sm' ? 'labelStrong' : 'bodyStrong'}
        style={[styles.rotulo, { color: colorRotulo, opacity: loading ? 0 : 1 }]}
        numberOfLines={1}
      >
        {title}
      </ThemedText>

      {icon && iconPosition === 'derecha' ? (
        <Icon name={icon} size={size === 'sm' ? 'sm' : 'md'} color={colorRotulo} />
      ) : null}

      {/* El indicador se superpone: el boton no cambia de ancho al cargar. */}
      {loading ? (
        <View style={styles.capaCarga}>
          <ActivityIndicator color={colorRotulo} size="small" />
        </View>
      ) : null}
    </>
  );

  return (
    <Pressable
      onPressIn={alPresionar}
      onPressOut={alSoltar}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactivo, busy: loading }}
      style={fullWidth ? styles.anchoCompleto : undefined}
      {...rest}
    >
      <Animated.View
        style={[
          styles.base,
          {
            minHeight: ALTURA[size],
            paddingHorizontal: PADDING[size],
            borderRadius: Radius.md,
            opacity: inactivo ? Opacity.disabled : 1,
          },
          superficie,
          sombra,
          estiloAnimado,
          style,
        ]}
      >
        {esPrimario ? (
          <LinearGradient
            colors={[theme.ctaGradientStart, theme.ctaGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: Radius.md }]}
          />
        ) : null}

        {/* Filo superior: la luz siempre cae desde arriba. */}
        {variant !== 'ghost' ? (
          <View style={[styles.filoLuz, { backgroundColor: theme.topLight }]} />
        ) : null}

        {contenido}
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    overflow: 'hidden',
  },
  anchoCompleto: {
    alignSelf: 'stretch',
  },
  rotulo: {
    textAlign: 'center',
  },
  filoLuz: {
    position: 'absolute',
    top: 0,
    left: Spacing.three,
    right: Spacing.three,
    height: StyleSheet.hairlineWidth,
    pointerEvents: 'none',
  },
  capaCarga: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
});
