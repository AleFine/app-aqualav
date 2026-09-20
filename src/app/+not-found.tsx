import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';

export default function NotFoundScreen() {
  const router = useRouter();
  const goHome = useCallback(() => router.replace('/'), [router]);

  return (
    <Screen edges={[]} style={styles.container}>
      <ThemedText type="subtitle">Página no encontrada</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Esta ruta no existe en la aplicación.
      </ThemedText>
      <Button title="Ir al inicio" onPress={goHome} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
});
