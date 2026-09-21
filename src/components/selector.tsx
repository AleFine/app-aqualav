/**
 * Selector de chips para listas cerradas y cortas: tipo de vehiculo, medio de
 * pago, filtro de estado. Un desplegable necesitaria un modulo nativo; los
 * chips no necesitan ninguno y se leen mejor en un telefono.
 *
 * El chip elegido no se distingue solo por el color: lleva ademas el icono de
 * confirmacion, para que la seleccion sea visible sin depender del contraste
 * entre azules.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { HitSize, Radius, Spacing, conAlfa, elevacion } from '@/constants/theme';
import { usePresion } from '@/hooks/use-presion';
import { useTheme } from '@/hooks/use-theme';
import { seleccion } from '@/utils/haptica';

export type OpcionSelector<T extends string> = {
  valor: T;
  etiqueta: string;
};

type SelectorProps<T extends string> = {
  label: string;
  opciones: readonly OpcionSelector<T>[];
  /** `null` significa que todavia no hay nada seleccionado. */
  valor: T | null;
  onChange: (valor: T) => void;
  error?: string | null;
};

type ChipProps = {
  etiqueta: string;
  seleccionada: boolean;
  /** El grupo tiene error y este chip no es el elegido. */
  conError: boolean;
  onPress: () => void;
};

/**
 * Un chip suelto. Vive en su propio componente porque `usePresion` es un hook y
 * no puede llamarse dentro del `map` de las opciones.
 */
function Chip({ etiqueta, seleccionada, conError, onPress }: ChipProps) {
  const theme = useTheme();
  /* La haptica la emite `seleccion()` al cambiar: aqui solo va la escala. */
  const { estiloAnimado, alPresionar, alSoltar } = usePresion({ haptica: false });

  const fondo = seleccionada ? theme.brand : theme.surfaceSunken;
  const borde = seleccionada ? theme.brand : conError ? theme.danger : theme.border;
  const colorTexto = seleccionada ? theme.onBrand : theme.textSecondary;

  /* Solo el chip elegido proyecta halo, y tenido de marca, no gris. */
  const halo = seleccionada
    ? { boxShadow: `0px 6px 16px ${conAlfa(theme.brand, 0.3)}`, elevation: 6 }
    : elevacion(0, theme.shadow);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: seleccionada }}
      onPress={onPress}
      onPressIn={alPresionar}
      onPressOut={alSoltar}>
      <Animated.View
        style={[
          styles.chip,
          { backgroundColor: fondo, borderColor: borde },
          halo,
          estiloAnimado,
        ]}>
        {seleccionada ? <Icon name="confirmar" size="xs" color={colorTexto} /> : null}

        <ThemedText type="smallBold" style={{ color: colorTexto }}>
          {etiqueta}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

export function Selector<T extends string>({
  label,
  opciones,
  valor,
  onChange,
  error,
}: SelectorProps<T>) {
  return (
    <View style={styles.root}>
      <ThemedText type="small" themeColor={error ? 'danger' : 'textSecondary'}>
        {label}
      </ThemedText>

      <View style={styles.opciones}>
        {opciones.map((opcion) => {
          const seleccionada = opcion.valor === valor;

          return (
            <Chip
              key={opcion.valor}
              etiqueta={opcion.etiqueta}
              seleccionada={seleccionada}
              conError={Boolean(error) && !seleccionada}
              onPress={() => {
                seleccion();
                onChange(opcion.valor);
              }}
            />
          );
        })}
      </View>

      {error ? (
        <ThemedText type="small" themeColor="danger">
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    /* 44pt: el minimo tactil de Apple, tambien para un chip. */
    minHeight: HitSize.min,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
});
