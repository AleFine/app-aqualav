import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInput } from 'react-native';

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
import {
  CORREO_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  TELEFONO_LENGTH,
  validarApellidos,
  validarCorreo,
  validarNombres,
  validarPassword,
  validarTelefono,
} from '@/utils/validation';

/** Time the success notice stays on screen before going back to the login. */
const BACK_DELAY_MS = 1200;

const POLITICA_ERROR = 'Debes aceptar la política de tratamiento de datos';

/** RF-001: client self-registration. The backend always assigns the `cliente` role. */
export default function RegistrarScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { registrarse } = useAuth();
  const { toast, show, hide } = useToast();

  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [aceptaPolitica, setAceptaPolitica] = useState(false);

  const [nombresError, setNombresError] = useState<string | null>(null);
  const [apellidosError, setApellidosError] = useState<string | null>(null);
  const [correoError, setCorreoError] = useState<string | null>(null);
  const [telefonoError, setTelefonoError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [politicaError, setPoliticaError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nombresRef = useRef<TextInput>(null);
  const apellidosRef = useRef<TextInput>(null);
  const correoRef = useRef<TextInput>(null);
  const telefonoRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const backTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (backTimeout.current) {
        clearTimeout(backTimeout.current);
      }
    };
  }, []);

  const goBack = useCallback(() => router.back(), [router]);

  const togglePolitica = useCallback(() => {
    setAceptaPolitica((aceptada) => !aceptada);
    setPoliticaError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    const nombresValue = nombres.trim();
    const apellidosValue = apellidos.trim();
    const correoValue = correo.trim();
    const telefonoValue = telefono.trim();

    // Validate everything, then focus the first failure. Nothing typed is lost
    // when the submit fails (RNF-009 M4).
    const nextNombresError = validarNombres(nombresValue);
    const nextApellidosError = validarApellidos(apellidosValue);
    const nextCorreoError = validarCorreo(correoValue);
    const nextTelefonoError = validarTelefono(telefonoValue);
    const nextPasswordError = validarPassword(password);
    const nextPoliticaError = aceptaPolitica ? null : POLITICA_ERROR;

    setNombresError(nextNombresError);
    setApellidosError(nextApellidosError);
    setCorreoError(nextCorreoError);
    setTelefonoError(nextTelefonoError);
    setPasswordError(nextPasswordError);
    setPoliticaError(nextPoliticaError);

    if (nextNombresError) {
      nombresRef.current?.focus();
      return;
    }
    if (nextApellidosError) {
      apellidosRef.current?.focus();
      return;
    }
    if (nextCorreoError) {
      correoRef.current?.focus();
      return;
    }
    if (nextTelefonoError) {
      telefonoRef.current?.focus();
      return;
    }
    if (nextPasswordError) {
      passwordRef.current?.focus();
      return;
    }
    // The policy checkbox blocks the submit (RF-001 flow step 3).
    if (nextPoliticaError) {
      show(nextPoliticaError, 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      await registrarse({
        nombres: nombresValue,
        apellidos: apellidosValue,
        correo: correoValue,
        telefono: telefonoValue,
        password,
        acepta_politica: true,
      });

      show('Cuenta creada. Ya puedes iniciar sesión.');
      backTimeout.current = setTimeout(goBack, BACK_DELAY_MS);
    } catch (error) {
      setIsSubmitting(false);

      if (error instanceof ApiError && error.codigo === 'CORREO_YA_REGISTRADO') {
        setCorreoError(error.message);
        correoRef.current?.focus();
        return;
      }

      show(error instanceof ApiError ? error.message : 'No se pudo registrar', 'error');
    }
  }, [
    aceptaPolitica,
    apellidos,
    correo,
    goBack,
    nombres,
    password,
    registrarse,
    show,
    telefono,
  ]);

  return (
    <>
      <AuthScreen
        title="Crear cuenta"
        subtitle="Regístrate para reservar tu lavado"
        onBack={goBack}>
        <TextField
          ref={nombresRef}
          label="Nombres"
          value={nombres}
          onChangeText={setNombres}
          error={nombresError}
          autoCapitalize="words"
          autoComplete="given-name"
          returnKeyType="next"
          onSubmitEditing={() => apellidosRef.current?.focus()}
        />

        <TextField
          ref={apellidosRef}
          label="Apellidos"
          value={apellidos}
          onChangeText={setApellidos}
          error={apellidosError}
          autoCapitalize="words"
          autoComplete="family-name"
          returnKeyType="next"
          onSubmitEditing={() => correoRef.current?.focus()}
        />

        <TextField
          ref={correoRef}
          label="Correo electrónico"
          value={correo}
          onChangeText={setCorreo}
          error={correoError}
          maxLength={CORREO_MAX_LENGTH}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => telefonoRef.current?.focus()}
        />

        <TextField
          ref={telefonoRef}
          label="Teléfono"
          value={telefono}
          onChangeText={setTelefono}
          error={telefonoError}
          helper="9 dígitos, empieza con 9"
          counter
          maxLength={TELEFONO_LENGTH}
          keyboardType="number-pad"
          autoComplete="tel"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <TextField
          ref={passwordRef}
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          error={passwordError}
          helper={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres, con mayúscula, minúscula y número`}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: aceptaPolitica }}
          onPress={togglePolitica}
          style={({ pressed }) => [styles.politica, pressed && styles.pressed]}>
          <View
            style={[
              styles.casilla,
              {
                borderColor: politicaError ? theme.danger : theme.border,
                backgroundColor: aceptaPolitica ? theme.tint : 'transparent',
              },
            ]}>
            {aceptaPolitica ? (
              <ThemedText type="smallBold" style={{ color: theme.tintText }}>
                ✓
              </ThemedText>
            ) : null}
          </View>

          <ThemedText
            type="small"
            themeColor={politicaError ? 'danger' : 'textSecondary'}
            style={styles.politicaTexto}>
            Acepto la política de tratamiento de datos personales
          </ThemedText>
        </Pressable>

        {politicaError ? (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {politicaError}
          </ThemedText>
        ) : null}

        <Button
          title="Registrarme"
          loading={isSubmitting}
          onPress={handleSubmit}
          style={styles.submit}
        />
      </AuthScreen>

      <Toast message={toast?.message ?? null} tone={toast?.tone} onHide={hide} />
    </>
  );
}

const styles = StyleSheet.create({
  submit: {
    borderRadius: Radius.lg,
    marginTop: Spacing.two,
  },
  politica: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  politicaTexto: {
    flex: 1,
  },
  casilla: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
