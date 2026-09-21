/**
 * Confirmacion obligatoria antes de toda accion irreversible (RNF-009 M2):
 * cancelar una reserva, entregar un vehiculo, desactivar un servicio.
 *
 * El dialogo abre con un distintivo circular arriba: el icono nombra la
 * naturaleza de la accion antes de que el usuario lea el titulo, y en el caso
 * destructivo el rojo deja de ser la unica advertencia.
 *
 * Se cierra por el velo, por el boton de cancelar y por el boton fisico de
 * atras de Android (`onRequestClose`).
 */

import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { MaxFormWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { toqueFirme } from '@/utils/haptica';

type ConfirmarDialogoProps = {
  visible: boolean;
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
  /** `peligro` pinta la accion de confirmar con el color destructivo. */
  tono?: 'neutral' | 'peligro';
  onConfirmar: () => void;
  onCancelar: () => void;
};

/** Tamanio del distintivo circular del encabezado. */
const DISTINTIVO = 64;

export function ConfirmarDialogo({
  visible,
  titulo,
  mensaje,
  textoConfirmar,
  tono = 'neutral',
  onConfirmar,
  onCancelar,
}: ConfirmarDialogoProps) {
  const theme = useTheme();

  const esPeligro = tono === 'peligro';
  const fondoDistintivo = esPeligro ? theme.dangerSoft : theme.warningSoft;

  const confirmar = () => {
    /* Golpe firme: la accion es definitiva y el cuerpo debe registrarlo. */
    toqueFirme();
    onConfirmar();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancelar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        style={[styles.fondo, { backgroundColor: theme.scrim }]}
        onPress={onCancelar}>
        {/* Absorbe los toques sobre la tarjeta para que no cierren el dialogo. */}
        <Pressable style={styles.envoltorio} onPress={() => undefined}>
          <Card variant="elevated" style={styles.tarjeta}>
            <View style={[styles.distintivo, { backgroundColor: fondoDistintivo }]}>
              <Icon
                name={esPeligro ? 'error' : 'alerta'}
                size="xl"
                tone={esPeligro ? 'danger' : 'warning'}
              />
            </View>

            <ThemedText type="heading" style={styles.centrado}>
              {titulo}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centrado}>
              {mensaje}
            </ThemedText>

            <View style={styles.acciones}>
              {/* El ancho lo reparte el contenedor: `Button` no expone su area tactil. */}
              <View style={styles.accion}>
                <Button title="Cancelar" variant="ghost" fullWidth onPress={onCancelar} />
              </View>
              <View style={styles.accion}>
                <Button
                  title={textoConfirmar}
                  variant={esPeligro ? 'danger' : 'primary'}
                  fullWidth
                  onPress={confirmar}
                />
              </View>
            </View>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  envoltorio: {
    width: '100%',
    maxWidth: MaxFormWidth,
  },
  tarjeta: {
    alignItems: 'center',
  },
  distintivo: {
    width: DISTINTIVO,
    height: DISTINTIVO,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centrado: {
    textAlign: 'center',
  },
  acciones: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: Spacing.two,
  },
  accion: {
    flex: 1,
  },
});
