import { Redirect } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';

/**
 * Landing router (RF-002 CA-03): sends each role to its own home screen. The
 * role only picks the navigator here; what the user may actually do is decided
 * by the backend and, for the UI, by `tiene(permiso)`.
 */
export default function IndexScreen() {
  const { isAuthenticated, rol } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  switch (rol) {
    case 'personal':
      return <Redirect href="/(personal)/operacion" />;
    case 'administrador':
      return <Redirect href="/(admin)/servicios" />;
    default:
      return <Redirect href="/(cliente)/inicio" />;
  }
}
