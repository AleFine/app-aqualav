import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBar } from 'expo-status-bar';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { GradientBackground } from '@/components/ui/gradient-background';
import { Icon } from '@/components/ui/icon';
import { HitSize, MaxFormWidth, Radius, Spacing, conAlfa } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Estructura comun de las pantallas de acceso: fondo degradado con causticas,
 * marca sobre el fondo y una tarjeta elevada con el formulario, centrada y a
 * prueba de teclado.
 *
 * La marca aparece aqui y solo aqui: es el unico momento en que la app puede
 * presentarse sin robarle espacio a una tarea del usuario.
 */

type AuthScreenProps = {
  title: string;
  subtitle?: string;
  /** Contenido de la tarjeta. */
  children: ReactNode;
  /** Contenido opcional bajo la tarjeta. */
  footer?: ReactNode;
  onBack?: () => void;
};

export function AuthScreen({ title, subtitle, children, footer, onBack }: AuthScreenProps) {
  const theme = useTheme();

  /* Vidrio sobre el degradado: translucido, nunca un color plano. */
  const vidrio = {
    backgroundColor: conAlfa(theme.onGradient, 0.14),
    borderColor: conAlfa(theme.onGradient, 0.22),
  };

  return (
    <GradientBackground>
      {/* El degradado es oscuro en ambos esquemas: iconos claros arriba. */}
      <StatusBar style="light" />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.safeArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.form}>
              {onBack ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Volver"
                  hitSlop={Spacing.two}
                  onPress={onBack}
                  style={({ pressed }) => [
                    styles.botonAtras,
                    vidrio,
                    pressed && styles.presionado,
                  ]}
                >
                  <Icon name="atras" size="md" color={theme.onGradient} />
                </Pressable>
              ) : null}

              <View style={styles.marca}>
                <View style={[styles.sello, vidrio]}>
                  <Icon name="inicio" size="lg" color={theme.onGradient} />
                </View>
                <ThemedText type="labelStrong" style={{ color: theme.onGradientMuted }}>
                  AquaLav
                </ThemedText>
              </View>

              <View style={styles.encabezado}>
                <ThemedText type="title" style={{ color: theme.onGradient }}>
                  {title}
                </ThemedText>
                {subtitle ? (
                  <ThemedText type="small" style={{ color: theme.onGradientMuted }}>
                    {subtitle}
                  </ThemedText>
                ) : null}
              </View>

              <Card variant="elevated">{children}</Card>

              {footer}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  form: {
    width: '100%',
    maxWidth: MaxFormWidth,
    alignSelf: 'center',
    gap: Spacing.three,
  },
  botonAtras: {
    alignSelf: 'flex-start',
    width: HitSize.min,
    height: HitSize.min,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presionado: {
    opacity: 0.6,
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sello: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  encabezado: {
    gap: Spacing.one,
  },
});
