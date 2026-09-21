/**
 * Sistema de iconos de AquaLav.
 *
 * Proveedor: Lucide (licencia ISC, uso comercial libre). Se eligio por tres
 * razones concretas: una sola retícula de 24x24, grosor de trazo uniforme y
 * entrega en SVG, asi que el icono se tiñe con el tema y nunca se pixela.
 *
 * Regla: ningun archivo fuera de este importa `lucide-react-native`. Todo pasa
 * por el registro `ICONOS`, de modo que el grosor, el tamanio y el color
 * quedan centralizados y TypeScript rechaza un nombre inexistente.
 *
 * Nota de version: Lucide 1.x elimino los alias antiguos, por lo que aqui se
 * usan unicamente los nombres canonicos (`TriangleAlert`, no `AlertTriangle`).
 */

import { memo } from 'react';

import {
  ArrowRight,
  Ban,
  Banknote,
  Bike,
  CalendarDays,
  Car,
  CarFront,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  CircleUser,
  ClipboardList,
  Clock,
  CreditCard,
  Droplets,
  Eye,
  EyeOff,
  Hourglass,
  Inbox,
  Info,
  LayoutGrid,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Timer,
  TriangleAlert,
  Truck,
  User,
  Wallet,
  Waves,
  WifiOff,
  X,
} from 'lucide-react-native';

import { IconSize, IconStroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Registro cerrado de iconos. Las claves son semanticas, no descriptivas: si
 * manana cambia el glifo de "reserva", se cambia aqui y no en 17 pantallas.
 */
export const ICONOS = {
  /* Navegacion principal */
  inicio: Waves,
  servicios: Droplets,
  vehiculos: Car,
  perfil: CircleUser,
  operacion: LayoutGrid,
  buscar: Search,
  reservas: ClipboardList,

  /* Direccion y control */
  atras: ChevronLeft,
  adelante: ChevronRight,
  desplegar: ChevronDown,
  avanzar: ArrowRight,
  cerrar: X,
  confirmar: Check,
  agregar: Plus,
  editar: Pencil,
  recargar: RefreshCw,
  filtrar: SlidersHorizontal,
  salir: LogOut,

  /* Estado y retroalimentacion */
  exito: CircleCheck,
  alerta: TriangleAlert,
  error: CircleAlert,
  info: Info,
  ayuda: CircleHelp,
  bloqueado: Ban,
  sinConexion: WifiOff,
  vacio: Inbox,

  /* Dominio: reserva y servicio */
  fecha: CalendarDays,
  hora: Clock,
  duracion: Timer,
  espera: Hourglass,
  bahia: MapPin,
  categoria: Tag,
  destacado: Sparkles,

  /* Dominio: pago */
  pago: Wallet,
  efectivo: Banknote,
  tarjeta: CreditCard,

  /* Dominio: vehiculo */
  sedan: Car,
  suv: CarFront,
  camioneta: Truck,
  motocicleta: Bike,

  /* Dominio: cuenta */
  usuario: User,
  correo: Mail,
  telefono: Phone,
  clave: Lock,
  verClave: Eye,
  ocultarClave: EyeOff,
  permiso: ShieldCheck,
} as const;

export type NombreIcono = keyof typeof ICONOS;
export type TamanioIcono = keyof typeof IconSize;

/** Colores del tema admitidos como tono de icono. */
export type TonoIcono =
  | 'text'
  | 'textSecondary'
  | 'textMuted'
  | 'brand'
  | 'brandMuted'
  | 'onBrand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'onGradient';

export type IconProps = {
  name: NombreIcono;
  /** Token de tamanio. Por defecto `md` (20). */
  size?: TamanioIcono;
  /** Token de color del tema. Por defecto hereda `textSecondary`. */
  tone?: TonoIcono;
  /** Color crudo. Solo para superficies que no estan en el tema (degradados). */
  color?: string;
  /**
   * Etiqueta accesible. Obligatoria cuando el icono transmite informacion que
   * no esta duplicada en texto visible; se omite cuando es decorativo.
   */
  label?: string;
};

/**
 * Icono de la familia unica de la app.
 *
 * Sin `label` se marca como decorativo y los lectores de pantalla lo ignoran,
 * que es lo correcto cuando va acompanado de texto.
 */
export const Icon = memo(function Icon({
  name,
  size = 'md',
  tone = 'textSecondary',
  color,
  label,
}: IconProps) {
  const theme = useTheme();
  const Glifo = ICONOS[name];

  return (
    <Glifo
      size={IconSize[size]}
      color={color ?? theme[tone]}
      strokeWidth={IconStroke}
      /* El trazo no engorda al escalar el icono: la familia se ve uniforme. */
      absoluteStrokeWidth
      accessibilityElementsHidden={label === undefined}
      importantForAccessibility={label === undefined ? 'no-hide-descendants' : 'yes'}
      accessibilityRole={label === undefined ? 'none' : 'image'}
      accessibilityLabel={label}
    />
  );
});
