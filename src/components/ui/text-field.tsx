/**
 * Campo de texto de AquaLav.
 *
 * Equivale a `TextInputLayout` + `TextInputEditText` de Material: etiqueta
 * flotante, borde que se resalta al enfocar, texto de error, contador de
 * caracteres e interruptor para mostrar u ocultar la contrasenia.
 *
 * Forma: superficie hundida con el radio completo en las cuatro esquinas. El
 * campo es el hueco donde se escribe, no una tarjeta que sobresale; de ahi que
 * use `surfaceSunken` y no `surface`.
 *
 * El interruptor de la contrasenia es un icono, no texto: el rotulo "Mostrar"
 * cambiaba de ancho al alternar y empujaba el cursor.
 */

import { forwardRef, useEffect, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type NombreIcono } from '@/components/ui/icon';
import { Motion, Opacity, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholder'> & {
  label: string;
  value: string;
  /** Mensaje de error; sustituye al texto de ayuda y tiñe el campo. */
  error?: string | null;
  helper?: string;
  /** Muestra `value.length/maxLength` (necesita `maxLength`). */
  counter?: boolean;
  /** Icono guia al inicio del campo. Decorativo: la etiqueta ya lo nombra. */
  icon?: NombreIcono;
  containerStyle?: StyleProp<ViewStyle>;
};

/** Altura minima del campo. Deja aire para la etiqueta flotante y el texto. */
const ALTURA_MINIMA = 56;

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    value,
    error,
    helper,
    counter = false,
    icon,
    maxLength,
    secureTextEntry = false,
    containerStyle,
    onFocus,
    onBlur,
    ...rest
  },
  ref
) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isSecureVisible, setIsSecureVisible] = useState(false);

  const isFloating = isFocused || value.length > 0;
  // Un inicializador perezoso evita leer un ref durante el render.
  const [labelAnim] = useState(() => new Animated.Value(isFloating ? 1 : 0));

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: isFloating ? 1 : 0,
      duration: Motion.duration.fast,
      useNativeDriver: true,
    }).start();
  }, [isFloating, labelAnim]);

  const hayError = Boolean(error);
  const resaltado = isFocused || hayError;

  const colorBorde = hayError ? theme.danger : isFocused ? theme.brand : theme.border;
  const colorEtiqueta = hayError ? theme.danger : isFocused ? theme.brand : theme.textSecondary;
  const colorIcono = hayError ? theme.danger : isFocused ? theme.brand : theme.textMuted;

  return (
    <View style={containerStyle}>
      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.surfaceSunken,
            borderColor: colorBorde,
            borderWidth: resaltado ? 2 : 1,
          },
        ]}>
        {icon ? <Icon name={icon} size="md" color={colorIcono} /> : null}

        <View style={styles.columna}>
          <Animated.Text
            style={[
              styles.label,
              {
                color: colorEtiqueta,
                transform: [
                  {
                    translateY: labelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, -6],
                    }),
                  },
                  {
                    scale: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.78] }),
                  },
                ],
              },
            ]}>
            {label}
          </Animated.Text>

          <TextInput
            ref={ref}
            value={value}
            maxLength={maxLength}
            secureTextEntry={secureTextEntry && !isSecureVisible}
            selectionColor={theme.brand}
            style={[styles.input, { color: theme.text }]}
            onFocus={(event) => {
              setIsFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setIsFocused(false);
              onBlur?.(event);
            }}
            {...rest}
          />
        </View>

        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isSecureVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            /* El icono mide 20; el margen tactil lo lleva a 44, el minimo de Apple. */
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => setIsSecureVisible((visible) => !visible)}
            style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}>
            <Icon
              name={isSecureVisible ? 'ocultarClave' : 'verClave'}
              size="md"
              color={isFocused ? theme.brand : theme.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>

      {error || helper || counter ? (
        <View style={styles.footer}>
          <View style={styles.footerMessage}>
            {error ? (
              <View style={styles.errorFila}>
                {/* El icono duplica la senial del color: el error no depende del rojo. */}
                <Icon name="error" size="xs" tone="danger" />
                <ThemedText type="small" style={[styles.errorTexto, { color: theme.danger }]}>
                  {error}
                </ThemedText>
              </View>
            ) : helper ? (
              <ThemedText type="small" themeColor="textSecondary">
                {helper}
              </ThemedText>
            ) : null}
          </View>

          {counter && maxLength ? (
            <ThemedText type="small" themeColor="textMuted" tabular>
              {value.length}/{maxLength}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gutter,
    minHeight: ALTURA_MINIMA,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  columna: {
    flex: 1,
  },
  label: {
    ...Typography.label,
    transformOrigin: 'left center',
  },
  input: {
    /* Sin `lineHeight`: en Android descentra el texto dentro del campo. */
    fontFamily: Typography.body.fontFamily,
    fontSize: Typography.body.fontSize,
    paddingVertical: Spacing.two,
    // El outline del navegador duplicaría el borde del campo.
    outlineWidth: 0,
  },
  toggle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  togglePressed: {
    opacity: Opacity.ghost,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.one,
  },
  footerMessage: {
    flex: 1,
  },
  errorFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  errorTexto: {
    flex: 1,
  },
});
