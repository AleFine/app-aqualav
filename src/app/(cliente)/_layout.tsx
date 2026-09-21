import { Tabs } from 'expo-router/js-tabs';

import { crearBarraPestanias, type MapaIconos } from '@/components/ui/barra-pestanias';

/**
 * Iconos de los destinos del cliente. Una ruta ausente de este mapa no se
 * dibuja en la barra, que es justo lo que queremos para las pantallas de
 * detalle marcadas con `href: null`.
 */
const ICONOS: MapaIconos = {
  inicio: 'inicio',
  servicios: 'servicios',
  vehiculos: 'vehiculos',
  perfil: 'perfil',
};

/* Se crea fuera del componente: una identidad estable evita remontar la barra. */
const barraPestanias = crearBarraPestanias(ICONOS);

export default function ClienteLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={barraPestanias}>
      <Tabs.Screen name="inicio" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="servicios" options={{ title: 'Servicios' }} />
      <Tabs.Screen name="vehiculos" options={{ title: 'Vehículos' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />

      {/* Pantallas de detalle: alcanzables por ruta, ausentes de la barra. */}
      <Tabs.Screen name="reservar/[servicioId]" options={{ href: null }} />
      <Tabs.Screen name="reservas/index" options={{ href: null }} />
      <Tabs.Screen name="reservas/[id]" options={{ href: null }} />
    </Tabs>
  );
}
