import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { CatalogoEstadosProvider } from '@/hooks/use-catalogo-estados';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      {/* Inside AuthProvider: GET /estados needs a session. */}
      <CatalogoEstadosProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootNavigator />
          <StatusBar style="auto" />
        </ThemeProvider>
      </CatalogoEstadosProvider>
    </AuthProvider>
  );
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
    <Stack>
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
