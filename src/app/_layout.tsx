import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

// Per-weight subpaths, not the package root: @expo-google-fonts 0.4 ships each
// weight as its own entry point so the bundle only carries what is imported.
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { Sora_400Regular } from '@expo-google-fonts/sora/400Regular';
import { Sora_600SemiBold } from '@expo-google-fonts/sora/600SemiBold';
import { Sora_700Bold } from '@expo-google-fonts/sora/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';

import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { CatalogoEstadosProvider } from '@/hooks/use-catalogo-estados';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

// Keeps the native splash on screen until the typography is ready, so the app
// never shows a frame with fallback system fonts.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 320, fade: true });

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const esOscuro = colorScheme === 'dark';

  // Each weight is its own family: Android ignores `fontWeight` on custom fonts.
  const [fuentesListas, errorFuentes] = useFonts({
    Sora_400Regular,
    Sora_600SemiBold,
    Sora_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  // Paints the window behind the navigator, so rotation and overscroll never
  // reveal a white gap in dark mode.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(
      esOscuro ? Colors.dark.background : Colors.light.background,
    );
  }, [esOscuro]);

  useEffect(() => {
    // A font failure must not trap the user on the splash: render with the
    // system fallback instead.
    if (fuentesListas || errorFuentes) void SplashScreen.hideAsync();
  }, [fuentesListas, errorFuentes]);

  if (!fuentesListas && !errorFuentes) return null;

  return (
    <AuthProvider>
      {/* Inside AuthProvider: GET /estados needs a session. */}
      <CatalogoEstadosProvider>
        <ThemeProvider value={temaNavegacion(esOscuro)}>
          <RootNavigator />
          <StatusBar style={esOscuro ? 'light' : 'dark'} />
        </ThemeProvider>
      </CatalogoEstadosProvider>
    </AuthProvider>
  );
}

/**
 * Navigation chrome built from the app's own tokens.
 *
 * It spreads the stock theme rather than replacing it, because React Navigation
 * v7 also expects a `fonts` map that we do not want to restate here.
 */
function temaNavegacion(esOscuro: boolean) {
  const base = esOscuro ? DarkTheme : DefaultTheme;
  const paleta = esOscuro ? Colors.dark : Colors.light;

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: paleta.brand,
      background: paleta.background,
      card: paleta.surface,
      text: paleta.text,
      border: paleta.border,
      notification: paleta.danger,
    },
  };
}

/**
 * Routes are enabled by the session: without one only `(auth)` exists, and the
 * role decides which navigator is mounted afterwards.
 *
 * Choosing a navigator by role is presentation, not authorization: the backend
 * enforces every permission, and the UI gates its controls with
 * `useAuth().tiene(permiso)`.
 */
function RootNavigator() {
  const { isAuthenticated, isCargando, rol } = useAuth();
  const theme = useTheme();

  // Avoids flashing the login screen while the stored session is restored.
  if (isCargando) {
    return (
      <View style={[styles.splash, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.background },
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />

      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated && rol === 'cliente'}>
        <Stack.Screen name="(cliente)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated && rol === 'personal'}>
        <Stack.Screen name="(personal)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated && rol === 'administrador'}>
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Screen name="+not-found" options={{ title: 'Página no encontrada' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
