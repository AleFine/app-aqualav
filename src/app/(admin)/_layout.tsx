import { Stack } from 'expo-router';

/**
 * Administrator navigator: the service catalog and its create/edit form. A
 * stack, not tabs, because there is a single section (RF-010).
 */
export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="servicios" />
      <Stack.Screen name="servicio/[id]" />
    </Stack>
  );
}
