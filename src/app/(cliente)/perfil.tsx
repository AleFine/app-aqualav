import { memo, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ConfirmarDialogo } from '@/components/confirmar-dialogo';
import { Cargando } from '@/components/estado-vista';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import type { RolNombre } from '@/types/usuario';

/**
 * Profile tab: the identity data of the session, read only, plus sign out.
 *
 * Signing out destroys the session, so it goes behind a confirmation dialog
 * (RNF-009 M2). The role is only NAMED here; no control on this screen (or any
 * other) is gated by it.
 */

/** Spanish label of every role, for display purposes only. */
const ETIQUETA_ROL: Record<RolNombre, string> = {
  cliente: 'Cliente',
  personal: 'Personal',
  administrador: 'Administrador',
};

type DatoProps = {
  etiqueta: string;
  valor: string;
};

const Dato = memo(function Dato({ etiqueta, valor }: DatoProps) {
  return (
    <View style={styles.dato}>
      <ThemedText type="small" themeColor="textSecondary">
        {etiqueta}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.datoValor}>
        {valor}
      </ThemedText>
    </View>
  );
});

export default function ClientePerfilScreen() {
  const theme = useTheme();
  const { usuario, cerrarSesion } = useAuth();
  const { toast, show, hide } = useToast();

  const [dialogoVisible, setDialogoVisible] = useState(false);
  const [isSaliendo, setIsSaliendo] = useState(false);

  const abrirDialogo = useCallback(() => setDialogoVisible(true), []);
  const cerrarDialogo = useCallback(() => setDialogoVisible(false), []);

  const confirmarSalida = useCallback(() => {
    setDialogoVisible(false);
    setIsSaliendo(true);

    // The root layout mounts the auth navigator as soon as the session is gone,
    // so this screen unmounts on its own when the promise resolves.
    cerrarSesion().catch(() => {
      setIsSaliendo(false);
      show('No se pudo cerrar la sesión. Vuelve a intentarlo.', 'error');
    });
  }, [cerrarSesion, show]);

  if (!usuario) {
    return (
      <Screen style={styles.pantalla}>
        <Cargando mensaje="Cargando tu perfil…" />
      </Screen>
    );
  }

  return (
    <>
      <Screen style={styles.pantalla}>
        <ScrollView
          contentContainerStyle={styles.contenido}
          showsVerticalScrollIndicator={false}>
          <View style={styles.encabezado}>
            <ThemedText type="subtitle">Mi perfil</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Estos son los datos con los que te registraste.
            </ThemedText>
          </View>

          <Card>
            <View style={styles.identidad}>
              <ThemedText type="smallBold">
                {usuario.nombres} {usuario.apellidos}
              </ThemedText>
              <Badge label={ETIQUETA_ROL[usuario.rol]} tone="info" />
            </View>

            <Dato etiqueta="Nombres" valor={usuario.nombres} />
            <Dato etiqueta="Apellidos" valor={usuario.apellidos} />
            <Dato etiqueta="Correo electrónico" valor={usuario.correo} />
            <Dato etiqueta="Teléfono" valor={usuario.telefono} />
            <Dato etiqueta="Rol" valor={ETIQUETA_ROL[usuario.rol]} />
          </Card>

          <Button
            title="Cerrar sesión"
            loading={isSaliendo}
            onPress={abrirDialogo}
            style={[styles.salir, { backgroundColor: theme.danger }]}
          />
        </ScrollView>
      </Screen>

      <ConfirmarDialogo
        visible={dialogoVisible}
        titulo="Cerrar sesión"
        mensaje="Se cerrará tu sesión en este dispositivo y tendrás que ingresar tu correo y contraseña otra vez."
        textoConfirmar="Cerrar sesión"
        tono="peligro"
        onConfirmar={confirmarSalida}
        onCancelar={cerrarDialogo}
      />

      <Toast message={toast?.message ?? null} tone={toast?.tone} onHide={hide} />
    </>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    paddingTop: Spacing.three,
  },
  contenido: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  encabezado: {
    gap: Spacing.one,
  },
  identidad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  dato: {
    gap: Spacing.half,
  },
  datoValor: {
    flexShrink: 1,
  },
  salir: {
    borderRadius: Radius.lg,
    marginTop: Spacing.two,
  },
});
