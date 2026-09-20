/**
 * Form rules. They are the SAME rules the backend revalidates (contract §1 and
 * §4), so a form that passes here only fails on server-side business rules.
 *
 * Every validator keeps the same idiom: it takes the raw string and returns the
 * Spanish error message, or `null` when the value is valid.
 */

export const NOMBRES_MAX_LENGTH = 80;
export const APELLIDOS_MAX_LENGTH = 80;
export const CORREO_MAX_LENGTH = 160;
export const TELEFONO_LENGTH = 9;
export const PASSWORD_MIN_LENGTH = 8;
export const PLACA_MAX_LENGTH = 10;

/** Peruvian plates, both formats: `ABC-123`, `A1B-123` and `1234-AB`. */
export const PLACA_REGEX = /^([A-Z]{3}-\d{3}|[A-Z]\d[A-Z]-\d{3}|\d{4}-[A-Z]{2})$/;

/** Deliberately permissive: the backend is the authority on deliverability. */
const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ANIO_MINIMO = 1900;

export function validarNombres(nombres: string): string | null {
  const valor = nombres.trim();

  if (valor.length === 0) {
    return 'Ingresa tus nombres';
  }
  if (valor.length > NOMBRES_MAX_LENGTH) {
    return `Los nombres no pueden superar ${NOMBRES_MAX_LENGTH} caracteres`;
  }
  return null;
}

export function validarApellidos(apellidos: string): string | null {
  const valor = apellidos.trim();

  if (valor.length === 0) {
    return 'Ingresa tus apellidos';
  }
  if (valor.length > APELLIDOS_MAX_LENGTH) {
    return `Los apellidos no pueden superar ${APELLIDOS_MAX_LENGTH} caracteres`;
  }
  return null;
}

export function validarCorreo(correo: string): string | null {
  const valor = correo.trim();

  if (valor.length === 0) {
    return 'Ingresa tu correo electrónico';
  }
  if (valor.length > CORREO_MAX_LENGTH) {
    return `El correo no puede superar ${CORREO_MAX_LENGTH} caracteres`;
  }
  if (!CORREO_REGEX.test(valor)) {
    return 'Ingresa un correo válido, por ejemplo ana@correo.com';
  }
  return null;
}

/** Peruvian mobile number: exactly 9 digits starting with 9. */
export function validarTelefono(telefono: string): string | null {
  const valor = telefono.trim();

  if (valor.length === 0) {
    return 'Ingresa tu número de teléfono';
  }
  if (!/^\d+$/.test(valor)) {
    return 'El teléfono solo puede contener dígitos';
  }
  if (valor.length !== TELEFONO_LENGTH) {
    return `El teléfono debe tener ${TELEFONO_LENGTH} dígitos`;
  }
  if (!valor.startsWith('9')) {
    return 'El teléfono debe empezar con 9';
  }
  return null;
}

/**
 * Password policy (RNF-012): at least 8 characters, one uppercase letter, one
 * lowercase letter and one digit. The message names the missing criteria so the
 * user knows what to correct (RNF-009 M3).
 */
export function validarPassword(password: string): string | null {
  const faltantes: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    faltantes.push(`${PASSWORD_MIN_LENGTH} caracteres`);
  }
  if (!/[A-Z]/.test(password)) {
    faltantes.push('una letra mayúscula');
  }
  if (!/[a-z]/.test(password)) {
    faltantes.push('una letra minúscula');
  }
  if (!/\d/.test(password)) {
    faltantes.push('un número');
  }

  if (faltantes.length === 0) {
    return null;
  }

  return `La contraseña debe incluir ${unirConY(faltantes)}`;
}

/** Uppercases and strips spaces, the same normalisation the backend applies. */
export function normalizarPlaca(placa: string): string {
  return placa.replace(/\s/g, '').toUpperCase();
}

export function validarPlaca(placa: string): string | null {
  const valor = normalizarPlaca(placa);

  if (valor.length === 0) {
    return 'Ingresa la placa del vehículo';
  }
  if (!PLACA_REGEX.test(valor)) {
    return 'Formato de placa inválido. Usa ABC-123, A1B-123 o 1234-AB';
  }
  return null;
}

/** Vehicle model year: from 1900 up to next year. */
export function validarAnio(anio: string): string | null {
  const valor = anio.trim();
  const maximo = new Date().getFullYear() + 1;

  if (valor.length === 0) {
    return 'Ingresa el año del vehículo';
  }
  if (!/^\d{4}$/.test(valor)) {
    return 'El año debe tener 4 dígitos';
  }

  const numero = Number(valor);
  if (numero < ANIO_MINIMO || numero > maximo) {
    return `El año debe estar entre ${ANIO_MINIMO} y ${maximo}`;
  }
  return null;
}

/** Generic non-empty check for the free-text fields of the forms. */
export function validarRequerido(valor: string, etiqueta = 'Este campo'): string | null {
  return valor.trim().length === 0 ? `${etiqueta} es obligatorio` : null;
}

/** "a, b y c" — Spanish enumeration used by the password message. */
function unirConY(partes: string[]): string {
  if (partes.length === 1) {
    return partes[0];
  }

  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}
