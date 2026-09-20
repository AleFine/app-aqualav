import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { MaxFormWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Confirmation required before every irreversible action (RNF-009 M2): cancel
 * a reservation, check out, deactivate a service.
 */

type ConfirmarDialogoProps = {
  visible: boolean;
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
  /** `peligro` paints the confirm button with the destructive color. */
  tono?: 'neutral' | 'peligro';
  onConfirmar: () => void;
  onCancelar: () => void;
};

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancelar}>
      <Pressable accessibilityRole="button" style={styles.fondo} onPress={onCancelar}>
        {/* Swallows taps on the card so they do not dismiss the dialog. */}
        <Pressable
          style={[styles.tarjeta, { backgroundColor: theme.background }]}
          onPress={() => undefined}>
          <ThemedText type="smallBold">{titulo}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {mensaje}
          </ThemedText>

          <View style={styles.acciones}>
            <Button
              title="Cancelar"
              variant="secondary"
              onPress={onCancelar}
              style={styles.accion}
            />
            <Button
              title={textoConfirmar}
              onPress={onConfirmar}
              style={[
                styles.accion,
                tono === 'peligro' ? { backgroundColor: theme.danger } : null,
              ]}
            />
          </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  tarjeta: {
    width: '100%',
    maxWidth: MaxFormWidth,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  acciones: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  accion: {
    flex: 1,
    borderRadius: Radius.md,
  },
});
