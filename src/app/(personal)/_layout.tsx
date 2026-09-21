import { Tabs } from 'expo-router/js-tabs';

import { crearBarraPestanias, type MapaIconos } from '@/components/ui/barra-pestanias';

/** Destinos del personal de operacion. */
const ICONOS: MapaIconos = {
  operacion: 'operacion',
  buscar: 'buscar',
};

const barraPestanias = crearBarraPestanias(ICONOS);

export default function PersonalLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={barraPestanias}>
      <Tabs.Screen name="operacion" options={{ title: 'Operación' }} />
      <Tabs.Screen name="buscar" options={{ title: 'Buscar' }} />

      {/* Detalle de reserva: se abre desde una fila, no desde la barra. */}
      <Tabs.Screen name="reserva/[id]" options={{ href: null }} />
    </Tabs>
  );
}
