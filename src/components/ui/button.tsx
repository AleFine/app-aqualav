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

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: 'primary' | 'secondary';
  /** Muestra un spinner y bloquea el botón mientras hay una petición en curso. */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const Button = memo(function Button({
  title,
  variant = 'primary',
  loading = false,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  // El estado presionado cambia de color, como el `selector` de drawables del
  // botón original (normal azul / presionado turquesa).
  const backgroundFor = (pressed: boolean) => {
    if (isPrimary) {
      return pressed ? theme.accent : theme.tint;
    }
    return pressed ? theme.backgroundSelected : theme.backgroundElement;
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: backgroundFor(pressed && !isDisabled),
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
      {...rest}>
      <ThemedText type="smallBold" style={isPrimary ? { color: theme.tintText } : undefined}>
        {title}
      </ThemedText>

      {loading ? (
        <View style={styles.spinner}>
          <ActivityIndicator size="small" color={isPrimary ? theme.tintText : theme.text} />
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  spinner: {
    position: 'absolute',
    right: Spacing.three,
  },
});
