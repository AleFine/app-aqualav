import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, type TextInput } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/services/api-client';
import { validarCorreo, validarPassword } from '@/utils/validation';

/** RF-002: login by email and password. The role decides where the user lands. */
export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { iniciarSesion } = useAuth();
  const { toast, show, hide } = useToast();

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [correoError, setCorreoError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const correoRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSubmit = useCallback(async () => {
    const correoValue = correo.trim();

    // Validate everything first, then focus the first failing field. The typed
    // data is never cleared (RNF-009 M4).
    const nextCorreoError = validarCorreo(correoValue);
    const nextPasswordError = validarPassword(password);
    setCorreoError(nextCorreoError);
    setPasswordError(nextPasswordError);

    if (nextCorreoError) {
      correoRef.current?.focus();
      return;
    }

    if (nextPasswordError) {
      passwordRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      // Once the session exists, the root layout mounts the role navigator and
      // this screen unmounts on its own.
      await iniciarSesion(correoValue, password);
    } catch (error) {
      setIsSubmitting(false);

      if (error instanceof ApiError && error.codigo === 'CUENTA_BLOQUEADA') {
        show(mensajeBloqueo(error), 'error');
        return;
      }

      show(
        error instanceof ApiError ? error.message : 'No se pudo iniciar sesión',
        'error'
      );
    }
  }, [correo, iniciarSesion, password, show]);

  const goToRegister = useCallback(() => router.push('/(auth)/registrar'), [router]);

  return (
    <>
      <AuthScreen title="Iniciar sesión" subtitle="Ingresa con tu correo registrado">
        <TextField
          ref={correoRef}
          label="Correo electrónico"
          value={correo}
          onChangeText={setCorreo}
          error={correoError}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <TextField
          ref={passwordRef}
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          error={passwordError}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        <Button
          title="Iniciar sesión"
          loading={isSubmitting}
          onPress={handleSubmit}
          style={styles.submit}
        />

        <Pressable
          accessibilityRole="link"
          hitSlop={Spacing.two}
          onPress={goToRegister}
          style={({ pressed }) => [styles.register, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={{ color: theme.brand }}>
            ¿No tienes cuenta? Registrarse
          </ThemedText>
        </Pressable>
      </AuthScreen>

      <Toast message={toast?.message ?? null} tone={toast?.tone} onHide={hide} />
    </>
  );
}

/**
 * The 429 carries the remaining seconds in `detalles`; the toast names the wait
 * in minutes so the message states the corrective action (RNF-009 M3).
 */
function mensajeBloqueo(error: ApiError): string {
  const segundos = Number(error.detalles[0]?.mensaje?.match(/\d+/)?.[0] ?? NaN);

  if (Number.isNaN(segundos)) {
    return error.message;
  }

  const minutos = Math.max(1, Math.ceil(segundos / 60));
  return `${error.message} Vuelve a intentarlo en ${minutos} minuto${minutos === 1 ? '' : 's'}.`;
}

const styles = StyleSheet.create({
  submit: {
    borderRadius: Radius.lg,
    marginTop: Spacing.two,
  },
  register: {
    alignSelf: 'center',
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
});
