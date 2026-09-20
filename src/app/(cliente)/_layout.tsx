import { Tabs } from 'expo-router/js-tabs';

import { useTheme } from '@/hooks/use-theme';

/**
 * Client navigator: four tabs plus the reservation flow.
 *
 * The wizard and the reservation detail live in the same group so their URLs
 * stay `/(cliente)/...`; `href: null` keeps them out of the tab bar, and they
 * are reached with `router.push()` from the tabs.
 */
export default function ClienteLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
      }}>
      <Tabs.Screen name="inicio" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="servicios" options={{ title: 'Servicios' }} />
      <Tabs.Screen name="vehiculos" options={{ title: 'Vehículos' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />

      <Tabs.Screen name="reservar/[servicioId]" options={{ href: null }} />
      <Tabs.Screen name="reservas/index" options={{ href: null }} />
      <Tabs.Screen name="reservas/[id]" options={{ href: null }} />
    </Tabs>
  );
}
