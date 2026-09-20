import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { GradientBackground } from '@/components/ui/gradient-background';
import { MaxFormWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Estructura común de las pantallas de acceso: fondo degradado, título sobre el
 * fondo y una tarjeta elevada con el formulario, centrada y a prueba de teclado.
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

  return (
    <GradientBackground>
      {/* El degradado es oscuro en ambos esquemas: iconos claros arriba. */}
      <StatusBar style="light" />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.safeArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              {onBack ? (
                <Pressable
                  accessibilityRole="button"
                  hitSlop={Spacing.two}
                  onPress={onBack}
                  style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" style={{ color: theme.onGradient }}>
                    ← Volver
                  </ThemedText>
                </Pressable>
              ) : null}

              <View style={styles.header}>
                <ThemedText type="subtitle" style={{ color: theme.onGradient }}>
                  {title}
                </ThemedText>
                {subtitle ? (
                  <ThemedText type="small" style={styles.subtitle}>
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
  back: {
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.6,
  },
  header: {
    gap: Spacing.one,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.78)',
  },
});
