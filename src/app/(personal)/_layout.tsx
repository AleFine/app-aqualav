import { Tabs } from 'expo-router/js-tabs';

import { useTheme } from '@/hooks/use-theme';

/**
 * Staff navigator: the operation board and the search that starts a check-in.
 * The reservation detail is reached from both, so it stays out of the tab bar.
 */
export default function PersonalLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
      }}>
      <Tabs.Screen name="operacion" options={{ title: 'Operación' }} />
      <Tabs.Screen name="buscar" options={{ title: 'Buscar' }} />

      <Tabs.Screen name="reserva/[id]" options={{ href: null }} />
    </Tabs>
  );
}
