import { useRouter } from 'expo-router';
import { memo, useCallback, useRef, useState, type ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, View, type TextInput } from 'react-native';

import { EstadoBadge } from '@/components/estado-badge';
import { Cargando, VistaVacia } from '@/components/estado-vista';
import { Screen } from '@/components/screen';
import { Selector, type OpcionSelector } from '@/components/selector';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/services/api-client';
import { buscarReservas } from '@/services/reservas.service';
import type { Reserva } from '@/types/reserva';
import { formatearFecha, formatearRangoHorario } from '@/utils/formato';
import { normalizarPlaca, validarPlaca } from '@/utils/validation';

/**
 * RF-019 flow 1: find the reservation of the customer standing at the counter,
 * by reservation code or by plate, and open it to perform the check-in.
 *
 * The backend matches both keys exactly, so the screen normalises what the
 * staff types before asking (uppercase, no spaces, `AQL-` prefix added when it
 * is missing). Fewer taps, and no false "no encontrada".
 */

type ModoBusqueda = 'codigo' | 'placa';

const MODOS: readonly OpcionSelector<ModoBusqueda>[] = [
  { valor: 'codigo', etiqueta: 'Código' },
  { valor: 'placa', etiqueta: 'Placa' },
];

/** Reservation codes are `AQL-` plus six uppercase alphanumerics. */
const CODIGO_REGEX = /^AQL-[A-Z0-9]{6}$/;
const CODIGO_PREFIJO = 'AQL-';

/** Uppercases, strips spaces and adds the prefix when the staff omits it. */
function normalizarCodigo(codigo: string): string {
  const valor = codigo.replace(/\s/g, '').toUpperCase();

  if (valor.length === 0 || valor.startsWith(CODIGO_PREFIJO)) {
    return valor;
  }

  return `${CODIGO_PREFIJO}${valor}`;
}

function validarCodigo(codigo: string): string | null {
  const valor = normalizarCodigo(codigo);

  if (valor.length === 0) {
    return 'Ingresa el código de la reserva';
  }
  if (!CODIGO_REGEX.test(valor)) {
    return 'El código tiene el formato AQL-XXXXXX, por ejemplo AQL-7K2M9Q';
  }
  return null;
}

function claveReserva(reserva: Reserva): string {
  return String(reserva.id);
}

type ResultadoBusquedaProps = {
  reserva: Reserva;
  onPress: (id: number) => void;
};

/** Search hit: everything the counter needs to recognise the customer. */
const ResultadoBusqueda = memo(function ResultadoBusqueda({
  reserva,
  onPress,
}: ResultadoBusquedaProps) {
  const handlePress = useCallback(() => onPress(reserva.id), [onPress, reserva.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir la reserva ${reserva.codigo}`}
      onPress={handlePress}
      style={({ pressed }) => (pressed ? styles.presionado : null)}>
      <Card>
        <View style={styles.filaEntreExtremos}>
          <ThemedText type="smallBold">{reserva.codigo}</ThemedText>
          <EstadoBadge estado={reserva.estado} />
        </View>

        <ThemedText type="small">
          {reserva.cliente.nombres} {reserva.cliente.apellidos} · {reserva.cliente.telefono}
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary">
          {reserva.vehiculo.placa} · {reserva.vehiculo.marca} {reserva.vehiculo.modelo}
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary">
          {reserva.servicio.nombre} · {reserva.servicio.duracion_min} min
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary">
          {formatearFecha(reserva.inicio)} · {formatearRangoHorario(reserva.inicio, reserva.fin)}
        </ThemedText>
      </Card>
    </Pressable>
  );
});

export default function PersonalBuscarScreen() {
  const router = useRouter();
  const { toast, show, hide } = useToast();

  const [modo, setModo] = useState<ModoBusqueda>('codigo');
  const [termino, setTermino] = useState('');
  const [terminoError, setTerminoError] = useState<string | null>(null);
  const [resultados, setResultados] = useState<Reserva[] | null>(null);
  const [isBuscando, setIsBuscando] = useState(false);

  const terminoRef = useRef<TextInput>(null);

  const cambiarModo = useCallback((siguiente: ModoBusqueda) => {
    setModo(siguiente);
    setTerminoError(null);
    // The previous hits belong to the other key; keeping them would be a lie.
    setResultados(null);
  }, []);

  const escribirTermino = useCallback((valor: string) => {
    setTermino(valor);
    setTerminoError(null);
  }, []);

  const buscar = useCallback(async () => {
    // Validate first, then search. The typed text is never cleared (RNF-009 M4).
    const error = modo === 'codigo' ? validarCodigo(termino) : validarPlaca(termino);
    setTerminoError(error);

    if (error) {
      terminoRef.current?.focus();
      return;
    }

    setIsBuscando(true);

    try {
      const encontradas =
        modo === 'codigo'
          ? await buscarReservas({ codigo: normalizarCodigo(termino) })
          : await buscarReservas({ placa: normalizarPlaca(termino) });

      setResultados(encontradas);
    } catch (causa) {
      // 404 is the documented "nothing matched", not a failure to report.
      if (causa instanceof ApiError && causa.status === 404) {
        setResultados([]);
      } else {
        setResultados(null);
        show(
          causa instanceof ApiError ? causa.message : 'No se pudo completar la búsqueda',
          'error'
        );
      }
    } finally {
      setIsBuscando(false);
    }
  }, [modo, show, termino]);

  const handleBuscar = useCallback(() => {
    void buscar();
  }, [buscar]);

  const abrirReserva = useCallback(
    (id: number) => {
      router.push({ pathname: '/(personal)/reserva/[id]', params: { id } });
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: Reserva }) => (
      <ResultadoBusqueda reserva={item} onPress={abrirReserva} />
    ),
    [abrirReserva]
  );

  let contenido: ReactNode;

  if (isBuscando) {
    contenido = <Cargando mensaje="Buscando la reserva…" />;
  } else if (!resultados) {
    contenido = (
      <VistaVacia
        titulo="Busca la reserva del cliente"
        mensaje="Ingresa el código que recibió al reservar o la placa del vehículo para iniciar la atención."
      />
    );
  } else if (resultados.length === 0) {
    contenido = (
      <VistaVacia
        titulo="No se encontró ninguna reserva"
        mensaje={
          modo === 'codigo'
            ? `No hay reservas activas con el código ${normalizarCodigo(termino)}. Revisa el código o busca por placa.`
            : `No hay reservas activas para la placa ${normalizarPlaca(termino)}. Revisa la placa o busca por código.`
        }
      />
    );
  } else {
    contenido = (
      <FlatList
        data={resultados}
        keyExtractor={claveReserva}
        renderItem={renderItem}
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <>
      <Screen style={styles.pantalla}>
        <ThemedText type="smallBold">Buscar reserva</ThemedText>

        <Selector<ModoBusqueda>
          label="Buscar por"
          opciones={MODOS}
          valor={modo}
          onChange={cambiarModo}
        />

        <TextField
          ref={terminoRef}
          label={modo === 'codigo' ? 'Código de reserva' : 'Placa del vehículo'}
          value={termino}
          onChangeText={escribirTermino}
          error={terminoError}
          helper={modo === 'codigo' ? 'Formato AQL-XXXXXX' : 'Formato ABC-123, A1B-123 o 1234-AB'}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={handleBuscar}
        />

        <Button title="Buscar" loading={isBuscando} onPress={handleBuscar} />

        <View style={styles.contenido}>{contenido}</View>
      </Screen>

      <Toast message={toast?.message ?? null} tone={toast?.tone} onHide={hide} />
    </>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
  contenido: {
    flex: 1,
  },
  lista: {
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  filaEntreExtremos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  presionado: {
    opacity: 0.7,
  },
});
