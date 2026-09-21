/**
 * Sistema de diseño de AquaLav — "Profundidad".
 *
 * Concepto: la interfaz es agua vista desde arriba. La elevacion es profundidad:
 * las superficies suben desde el azul abisal hacia el celeste luminoso, y la luz
 * siempre cae desde arriba (de ahi el borde superior mas claro en cada tarjeta).
 *
 * Reglas de uso:
 * - Ninguna pantalla debe escribir un color crudo: todo sale de `useTheme()`.
 * - `Colors.light` y `Colors.dark` exponen exactamente las mismas claves.
 * - La rampa `Aqua` es la identidad de marca; los colores semanticos
 *   (exito/alerta/peligro) viven fuera de ella a proposito, porque el color
 *   funcional debe distinguirse del color de marca.
 */

import '@/global.css';

import { Platform, type TextStyle } from 'react-native';

/* -------------------------------------------------------------------------- */
/* Rampa de marca                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Escala azul oscuro -> celeste. `1000` es el abismo, `50` es la espuma.
 * Se expone para casos puntuales (degradados, ilustraciones); en componentes
 * se prefieren siempre los tokens semanticos de `Colors`.
 */
export const Aqua = {
  50: '#ECF7FE',
  100: '#D3ECFD',
  200: '#AEDDFB',
  300: '#7CC8F7',
  400: '#45AEEF',
  500: '#1C90D8',
  600: '#0F72B4',
  700: '#0E5A8F',
  800: '#114A72',
  900: '#123C5C',
  950: '#0A2439',
  1000: '#05141F',
} as const;

/* -------------------------------------------------------------------------- */
/* Tokens de color                                                            */
/* -------------------------------------------------------------------------- */

export const Colors = {
  light: {
    /* Texto */
    text: '#0A2439',
    textSecondary: '#4A6B84',
    /**
     * Texto de tercer nivel: metadatos, marcas de tiempo, ayudas.
     * Verificado en 4.68:1 sobre `background`. No aclarar mas: por debajo de
     * 4.5:1 deja de cumplir WCAG AA para texto pequenio.
     */
    textMuted: '#57748A',

    /* Lienzo y superficies (mas claro = mas cerca de la superficie) */
    background: '#F4FAFE',
    /** Superficie base de una tarjeta. */
    surface: '#FFFFFF',
    /** Superficie elevada: hojas, dialogos, popovers. */
    surfaceRaised: '#FFFFFF',
    /** Superficie hundida: campos, pistas de progreso, celdas vacias. */
    surfaceSunken: '#E7F2FB',
    /** Compatibilidad: equivale a `surfaceSunken`. */
    backgroundElement: '#E7F2FB',
    backgroundSelected: '#D3ECFD',

    /* Bordes */
    border: '#D2E4F1',
    borderStrong: '#B4D2E8',
    /** Filo superior que simula la luz cayendo sobre la superficie. */
    topLight: 'rgba(255, 255, 255, 0.9)',

    /*
     * Marca. El azul se fijo en 4.83:1 sobre `brandSoft` y 5.46:1 sobre
     * `background`: un tono mas claro caia a 4.38:1 en la pastilla teñida
     * (pestania activa, insignias), justo por debajo de AA.
     */
    tint: '#0D6AA8',
    tintText: '#FFFFFF',
    /** Alias semantico de `tint`. */
    brand: '#0D6AA8',
    /** Marca atenuada: iconos inactivos, bordes de acento. */
    brandMuted: '#5AA5D3',
    /** Fondo teñido de marca: chips, resaltes, estados seleccionados. */
    brandSoft: '#DCEEFA',
    onBrand: '#FFFFFF',

    /**
     * Extremos del degradado de la accion primaria.
     *
     * No son `brand`/`accent`: el celeste vivo solo alcanza 3.5:1 con texto
     * blanco, asi que el degradado del boton se mantiene dentro del rango
     * oscuro (4.74:1 en el extremo mas claro) y el celeste queda para
     * superficies decorativas, donde no carga texto.
     */
    ctaGradientStart: '#0B5990',
    ctaGradientEnd: '#1278C0',

    /** Compatibilidad: el antiguo acento de login. Ahora es el celeste vivo. */
    accent: '#1C90D8',

    /* Semanticos */
    /* Cada par texto/fondo esta verificado por encima de 4.5:1 entre si. */
    success: '#0B7A5E',
    successSoft: '#DCF3EC',
    warning: '#8C5B00',
    warningSoft: '#FBF0DA',
    danger: '#C2183F',
    dangerSoft: '#FBE2E8',
    info: '#0D6AA8',
    infoSoft: '#DCEEFA',
    onSemantic: '#FFFFFF',

    /* Atmosfera */
    gradientStart: '#0A2439',
    gradientMid: '#0F72B4',
    gradientEnd: '#45AEEF',
    onGradient: '#FFFFFF',
    /** Texto secundario sobre el degradado. */
    onGradientMuted: 'rgba(236, 247, 254, 0.76)',
    /** Halo luminoso de las capas causticas. */
    glow: 'rgba(124, 200, 247, 0.28)',
    /** Velo detras de modales y hojas. */
    scrim: 'rgba(10, 36, 57, 0.55)',
    /** Sombra proyectada: azulada, nunca negra pura. */
    shadow: '#0A2439',
  },

  dark: {
    /* Texto */
    text: '#ECF7FE',
    textSecondary: '#8FB8D4',
    textMuted: '#638CA8',

    /* Lienzo y superficies */
    background: '#05141F',
    surface: '#0C2136',
    surfaceRaised: '#12304A',
    surfaceSunken: '#081B2B',
    backgroundElement: '#0C2136',
    backgroundSelected: '#16395A',

    /* Bordes */
    border: '#1B4463',
    borderStrong: '#26597F',
    topLight: 'rgba(174, 221, 251, 0.14)',

    /* Marca */
    tint: '#45AEEF',
    tintText: '#05141F',
    brand: '#45AEEF',
    brandMuted: '#2F7CAE',
    brandSoft: '#0F3551',
    onBrand: '#05141F',

    /* En oscuro el rotulo es azul profundo, asi que el degradado si puede
       recorrer todo el celeste: 7.6:1 en el extremo mas apagado. */
    ctaGradientStart: '#45AEEF',
    ctaGradientEnd: '#7CC8F7',

    accent: '#7CC8F7',

    /* Semanticos */
    success: '#34D399',
    successSoft: '#0B3B33',
    warning: '#FBBF24',
    warningSoft: '#3D2F0B',
    danger: '#FB7185',
    dangerSoft: '#3E1420',
    info: '#45AEEF',
    infoSoft: '#0F3551',
    onSemantic: '#05141F',

    /* Atmosfera */
    gradientStart: '#04101A',
    gradientMid: '#0E5A8F',
    gradientEnd: '#1C90D8',
    onGradient: '#ECF7FE',
    onGradientMuted: 'rgba(236, 247, 254, 0.70)',
    glow: 'rgba(69, 174, 239, 0.22)',
    scrim: 'rgba(2, 9, 15, 0.72)',
    shadow: '#01080E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Theme = typeof Colors.light;

/* -------------------------------------------------------------------------- */
/* Tipografia                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Familias reales cargadas en `src/app/_layout.tsx`.
 *
 * Importante: en Android `fontWeight` se ignora con fuentes propias, asi que
 * cada peso es una familia distinta. Nunca combinar `fontFamily` de estas
 * constantes con `fontWeight`.
 */
export const FontFamily = {
  /** Sora: geometrica y tecnica. Titulos y cifras destacadas. */
  displayRegular: 'Sora_400Regular',
  displaySemiBold: 'Sora_600SemiBold',
  displayBold: 'Sora_700Bold',
  /** Plus Jakarta Sans: humanista y legible. Cuerpo e interfaz. */
  bodyRegular: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemiBold: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
} as const;

/** Escala tipografica. Cada entrada es un estilo completo, listo para `Text`. */
export const Typography = {
  /** Cifra heroica: precios grandes, contadores. */
  display: {
    fontFamily: FontFamily.displayBold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.2,
  },
  /** Titulo de pantalla. */
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.7,
  },
  /** Titulo de seccion mayor. */
  subtitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  /** Encabezado de tarjeta o bloque. */
  heading: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  /** Cuerpo por defecto. */
  body: {
    fontFamily: FontFamily.bodyRegular,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyStrong: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  /** Etiqueta de control, metadato de fila. */
  label: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  labelStrong: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  /** Texto auxiliar, ayudas, contadores. */
  caption: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  /** Rotulo de seccion en mayusculas. */
  overline: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
} as const;

/**
 * Cifras de ancho fijo. Obligatorio en precios, horarios y contadores para que
 * la fila no salte al cambiar el valor.
 */
export const TabularNums: TextStyle = {
  /* Sin `as const`: `fontVariant` espera un arreglo mutable, no una tupla. */
  fontVariant: ['tabular-nums'],
};

/** Familias del sistema. Se conserva para `code` y para la web. */
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/* -------------------------------------------------------------------------- */
/* Espaciado y forma                                                          */
/* -------------------------------------------------------------------------- */

/** Ritmo de 4pt. Los nombres historicos se conservan. */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
  seven: 64,
  /** Separacion entre elementos dentro de una fila compacta. */
  gutter: 12,
} as const;

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

/** Tamanios de icono. Nunca usar un valor suelto. */
export const IconSize = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

/** Grosor unico de trazo para toda la familia de iconos. */
export const IconStroke = 1.75;

/** Area tactil minima segun Apple HIG (44pt) y Material (48dp). */
export const HitSize = {
  min: 44,
  comfortable: 48,
} as const;

export const MaxContentWidth = 800;

/** Ancho maximo de las tarjetas de formulario (login, registro). */
export const MaxFormWidth = 420;

/* -------------------------------------------------------------------------- */
/* Elevacion                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Escala de profundidad. `level0` es el lienzo; cada nivel sube un paso hacia
 * la superficie. La sombra se tiñe con el azul del tema, nunca negro puro.
 *
 * Se usa `boxShadow` (soportado desde RN 0.76) y se mantiene `elevation` para
 * el orden de dibujo en Android.
 */
export function elevacion(nivel: 0 | 1 | 2 | 3, sombra: string) {
  switch (nivel) {
    case 0:
      return { boxShadow: 'none', elevation: 0 };
    case 1:
      return {
        boxShadow: `0px 2px 8px ${conAlfa(sombra, 0.1)}`,
        elevation: 2,
      };
    case 2:
      return {
        boxShadow: `0px 8px 24px ${conAlfa(sombra, 0.16)}`,
        elevation: 8,
      };
    case 3:
      return {
        boxShadow: `0px 20px 48px ${conAlfa(sombra, 0.28)}`,
        elevation: 16,
      };
  }
}

/** Convierte `#RRGGBB` a `rgba()` con el alfa indicado. */
export function conAlfa(hex: string, alfa: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}

/** Compatibilidad: sombra de tarjeta usada antes del sistema de niveles. */
export const Elevation = {
  card: {
    boxShadow: '0px 8px 24px rgba(10, 36, 57, 0.16)',
    elevation: 8,
  },
} as const;

/* -------------------------------------------------------------------------- */
/* Movimiento                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Tokens de movimiento. Toda animacion de la app sale de aqui para que la
 * interfaz tenga un solo ritmo.
 */
export const Motion = {
  duration: {
    /** Respuesta inmediata al tacto. */
    instant: 120,
    /** Micro-interaccion estandar. */
    fast: 180,
    /** Transicion de estado. */
    normal: 240,
    /** Entrada de pantalla o de hoja. */
    slow: 320,
  },
  /** La salida siempre es mas corta que la entrada: la interfaz se siente viva. */
  exitRatio: 0.65,
  /** Retraso entre elementos de una lista al aparecer. */
  stagger: 45,
  spring: {
    /** Resorte suave para entradas. */
    suave: { damping: 18, stiffness: 180, mass: 0.9 },
    /** Resorte firme para respuesta al tacto. */
    firme: { damping: 22, stiffness: 320, mass: 0.7 },
  },
  /** Escala aplicada al presionar una superficie tactil. */
  pressScale: 0.972,
} as const;

/** Opacidades con significado. */
export const Opacity = {
  disabled: 0.42,
  pressed: 0.82,
  ghost: 0.6,
} as const;

/** Escala de apilado. Evita `zIndex` improvisados. */
export const ZIndex = {
  base: 0,
  raised: 10,
  sticky: 20,
  overlay: 40,
  modal: 100,
  toast: 1000,
} as const;
