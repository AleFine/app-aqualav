import { Stack } from 'expo-router';

/** Las pantallas de acceso van sin barra de navegación, como en el enunciado. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
