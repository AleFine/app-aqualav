import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Chip picker for short closed lists: vehicle type, payment method, state
 * filter. A dropdown would need a native module; chips need none and read
 * better on a phone.
 */

export type OpcionSelector<T extends string> = {
  valor: T;
  etiqueta: string;
};

type SelectorProps<T extends string> = {
  label: string;
  opciones: readonly OpcionSelector<T>[];
  /** `null` means nothing is selected yet. */
  valor: T | null;
  onChange: (valor: T) => void;
  error?: string | null;
};

export function Selector<T extends string>({
  label,
  opciones,
  valor,
  onChange,
  error,
}: SelectorProps<T>) {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      <ThemedText type="small" themeColor={error ? 'danger' : 'textSecondary'}>
        {label}
      </ThemedText>

      <View style={styles.opciones}>
        {opciones.map((opcion) => {
          const seleccionada = opcion.valor === valor;

          return (
            <Pressable
              key={opcion.valor}
              accessibilityRole="radio"
              accessibilityState={{ selected: seleccionada }}
              onPress={() => onChange(opcion.valor)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: seleccionada ? theme.tint : theme.backgroundElement,
                  borderColor: error && !seleccionada ? theme.danger : theme.border,
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText
                type="smallBold"
                style={{ color: seleccionada ? theme.tintText : theme.text }}>
                {opcion.etiqueta}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.two,
  },
  opciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
