/**
 * Barra de pestanias de AquaLav.
 *
 * Reemplaza la barra de solo texto que traia la app. Aporta lo que Material y
 * la guia de Apple piden y faltaba: icono + rotulo en cada destino, estado
 * activo inequivoco, area tactil de 44 pt y respeto por el area segura.
 *
 * Decision de forma: la barra ocupa todo el ancho en vez de flotar. Una barra
 * flotante obligaria a cada lista a reservar espacio inferior; asi ninguna
 * pantalla necesita cambiar y el contenido nunca queda tapado.
 *
 * El fondo es translucido con desenfoque, de modo que el contenido se intuye
 * por debajo: la misma idea de profundidad del resto del sistema.
 */

import { memo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icon, type NombreIcono } from '@/components/ui/icon';
import { HitSize, Motion, Radius, Spacing, conAlfa } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { seleccion } from '@/utils/haptica';

/**
 * Forma estructural de lo que entrega el navegador de pestanias. Se declara
 * aqui en vez de importarla de `@react-navigation/bottom-tabs` para no atar el
 * componente a una dependencia transitiva.
 */
export type PropsBarraPestanias = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  descriptors: Record<
    string,
    { options: { title?: string; tabBarLabel?: unknown; href?: string | null } }
  >;
  navigation: {
    emit: (evento: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (nombre: string, parametros?: object) => void;
  };
};

/** Mapa de ruta -> icono. Si una ruta no esta aqui, no se dibuja en la barra. */
export type MapaIconos = Record<string, NombreIcono>;

type PestaniaProps = {
  etiqueta: string;
  icono: NombreIcono;
  activa: boolean;
  onPress: () => void;
};

const Pestania = memo(function Pestania({
  etiqueta,
  icono,
  activa,
  onPress,
}: PestaniaProps) {
  const theme = useTheme();
  const movimientoReducido = useReducedMotion();

  /* El resalte crece desde el centro al enfocarse: continuidad espacial. */
  const estiloResalte = useAnimatedStyle(() => {
    if (movimientoReducido) {
      return { opacity: activa ? 1 : 0, transform: [{ scaleX: 1 }] };
    }
    return {
      opacity: withTiming(activa ? 1 : 0, { duration: Motion.duration.fast }),
      transform: [
        { scaleX: withSpring(activa ? 1 : 0.4, Motion.spring.suave) },
      ],
    };
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: activa }}
      accessibilityLabel={etiqueta}
      style={styles.pestania}
    >
      <View style={styles.contenidoPestania}>
        <Animated.View
          style={[
            styles.resalte,
            { backgroundColor: theme.brandSoft },
            estiloResalte,
          ]}
        />
        <Icon
          name={icono}
          size="lg"
          tone={activa ? 'brand' : 'textMuted'}
        />
        <ThemedText
          type="caption"
          themeColor={activa ? 'brand' : 'textMuted'}
          numberOfLines={1}
        >
          {etiqueta}
        </ThemedText>
      </View>
    </Pressable>
  );
});

export function BarraPestanias({
  state,
  descriptors,
  navigation,
  iconos,
}: PropsBarraPestanias & { iconos: MapaIconos }) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();

  /* Las rutas con `href: null` son pantallas de detalle: no son destinos. */
  const visibles = state.routes.filter(
    (ruta) => descriptors[ruta.key]?.options.href !== null && iconos[ruta.name],
  );

  return (
    <View
      style={[
        styles.contenedor,
        {
          paddingBottom: Math.max(insets.bottom, Spacing.two),
          borderTopColor: theme.border,
          /* Respaldo solido: en Android el desenfoque puede no aplicarse. */
          backgroundColor: conAlfa(theme.background, Platform.OS === 'ios' ? 0.72 : 0.96),
        },
      ]}
    >
      <BlurView
        intensity={Platform.OS === 'ios' ? 40 : 0}
        tint={scheme === 'dark' ? 'dark' : 'light'}
        style={styles.desenfoque}
      />
      {/* Filo de luz superior, igual que en las tarjetas. */}
      <View style={[styles.filoLuz, { backgroundColor: theme.topLight }]} />

      <View style={styles.fila}>
        {visibles.map((ruta) => {
          const { options } = descriptors[ruta.key];
          const etiqueta = options.title ?? ruta.name;
          const activa = state.routes[state.index]?.key === ruta.key;

          return (
            <Pestania
              key={ruta.key}
              etiqueta={etiqueta}
              icono={iconos[ruta.name]}
              activa={activa}
              onPress={() => {
                const evento = navigation.emit({
                  type: 'tabPress',
                  target: ruta.key,
                  canPreventDefault: true,
                });
                if (activa || evento.defaultPrevented) return;
                seleccion();
                navigation.navigate(ruta.name);
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

/**
 * Adaptador para la prop `tabBar` del navegador.
 *
 * Concentra aqui la unica conversion de tipos: el navegador entrega su propia
 * forma y la barra declara el contrato estructural minimo que necesita, sin
 * atarse a un paquete transitivo. Acepta `unknown` a proposito, para que la
 * funcion siga siendo asignable aunque la firma del navegador cambie.
 */
export function crearBarraPestanias(iconos: MapaIconos) {
  return function TabBar(props: unknown) {
    return <BarraPestanias {...(props as PropsBarraPestanias)} iconos={iconos} />;
  };
}

const styles = StyleSheet.create({
  contenedor: {
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  desenfoque: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  filoLuz: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    pointerEvents: 'none',
  },
  fila: {
    flexDirection: 'row',
    paddingTop: Spacing.two,
  },
  pestania: {
    flex: 1,
    minHeight: HitSize.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenidoPestania: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  resalte: {
    position: 'absolute',
    top: -Spacing.half,
    left: -Spacing.three,
    right: -Spacing.three,
    bottom: -Spacing.half,
    borderRadius: Radius.full,
    pointerEvents: 'none',
  },
});
