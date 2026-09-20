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
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Equivalente a `TextInputLayout` + `TextInputEditText` de Material Components:
 * label flotante, línea inferior que se resalta al enfocar, texto de error,
 * contador de caracteres y botón para mostrar/ocultar la contraseña.
 */

export type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholder'> & {
  label: string;
  value: string;
  /** Mensaje de error; sustituye al texto de ayuda y tiñe el campo. */
  error?: string | null;
  helper?: string;
  /** Muestra `value.length/maxLength` (necesita `maxLength`). */
  counter?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

const LABEL_DURATION = 150;

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    value,
    error,
    helper,
    counter = false,
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
  // Igual que en Toast: un inicializador perezoso evita leer un ref en render.
  const [labelAnim] = useState(() => new Animated.Value(isFloating ? 1 : 0));

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: isFloating ? 1 : 0,
      duration: LABEL_DURATION,
      useNativeDriver: true,
    }).start();
  }, [isFloating, labelAnim]);

  const accentColor = error ? theme.danger : isFocused ? theme.tint : theme.border;
  const labelColor = error ? theme.danger : isFocused ? theme.tint : theme.textSecondary;

  return (
    <View style={containerStyle}>
      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.backgroundElement,
            borderBottomColor: accentColor,
            borderBottomWidth: isFocused || !!error ? 2 : 1,
          },
        ]}>
        <Animated.Text
          style={[
            styles.label,
            {
              color: labelColor,
              transform: [
                {
                  translateY: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [10, -6] }),
                },
                {
                  scale: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.78] }),
                },
              ],
            },
          ]}>
          {label}
        </Animated.Text>

        <View style={styles.inputRow}>
          <TextInput
            ref={ref}
            value={value}
            maxLength={maxLength}
            secureTextEntry={secureTextEntry && !isSecureVisible}
            selectionColor={theme.tint}
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

          {secureTextEntry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isSecureVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              hitSlop={Spacing.two}
              onPress={() => setIsSecureVisible((visible) => !visible)}
              style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                {isSecureVisible ? 'Ocultar' : 'Mostrar'}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>

      {error || helper || counter ? (
        <View style={styles.footer}>
          <View style={styles.footerMessage}>
            {error ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {error}
              </ThemedText>
            ) : helper ? (
              <ThemedText type="small" themeColor="textSecondary">
                {helper}
              </ThemedText>
            ) : null}
          </View>

          {counter && maxLength ? (
            <ThemedText type="small" themeColor="textSecondary">
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
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    transformOrigin: 'left center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.two,
    // El outline del navegador duplicaría el borde inferior del campo.
    outlineWidth: 0,
  },
  toggle: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  togglePressed: {
    opacity: 0.6,
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
});
