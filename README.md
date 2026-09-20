# app-aqualav — cliente móvil del MVP de AquaLav

Aplicación móvil del sistema de reservas de un lavadero de autos. Cubre el
subconjunto de requisitos definido en `SRS-AquaLav-MVP-v0.1.md` para los tres
perfiles del MVP:

- **Cliente**: registro e inicio de sesión, catálogo de servicios, vehículos,
  reserva de un bloque disponible, historial y seguimiento del servicio.
- **Personal**: tablero de la operación del día, búsqueda por código o placa,
  check-in, avance de estado, registro del cobro y entrega del vehículo.
- **Administrador**: alta, edición, activación y desactivación de servicios con
  su precio y su duración.

Toda la lógica de negocio vive en el backend (`service-aqualav`). Esta
aplicación consume su API REST: no decide transiciones de estado, no calcula
disponibilidad y no autoriza por sí misma.

- **Zona horaria de negocio**: `America/Lima`.
- **Importes**: enteros en céntimos (`monto_centimos`) con su moneda (`PEN`).
  Nunca se envía un decimal.
- **Idioma**: toda la interfaz está en español; el código y los comentarios, en
  inglés.

---

## 1. Stack

| Paquete | Versión | Rol |
| --- | --- | --- |
| expo | 57.x | Cadena de herramientas y runtime nativo |
| expo-router | 57.x (v6) | Navegación basada en archivos, con rutas tipadas |
| react-native | 0.86.x | Runtime nativo (New Architecture) |
| react | 19.2.x | UI, con React Compiler activado |
| expo-secure-store | 57.x | Almacén cifrado de los tokens de sesión |
| typescript | 6.x | Modo estricto |
| eslint | 9.x | Configuración plana `eslint-config-expo` |

Detalles del SDK 57 que condicionan el código:

- Las pestañas se importan de `expo-router/js-tabs`; `Tabs` de `expo-router`
  quedó obsoleto.
- Las rutas de detalle dentro de un grupo con pestañas se registran con
  `options={{ href: null }}`, así que **la barra de pestañas sigue visible** en
  ellas y cada pantalla de detalle dibuja su propio botón «Volver».
- Los tipos de rutas (`.expo/types/router.d.ts`) los genera el servidor de
  desarrollo. Si agregas un archivo de ruta, arranca `npx expo start` una vez
  antes de confiar en `tsc`.
- El estilado es `StyleSheet.create` + `useTheme()`. **NativeWind/Tailwind no
  están instalados y no deben agregarse**: no hay `className` en ninguna parte.

---

## 2. Puesta en marcha en menos de 15 minutos

### 2.1 Requisitos

- Node.js 20 o superior y npm.
- La API corriendo (ver `service-aqualav/README.md`; con Docker es
  `docker compose up --build` y queda escuchando en el puerto `8000`).
- Para probar en el celular: la app **Expo Go** y estar en la misma red Wi-Fi
  que la computadora. Para probar en Android sin celular: Android Studio con un
  emulador creado.

### 2.2 Instalar

```bash
npm install
```

### 2.3 Apuntar la app al backend

La URL base sale de la variable `EXPO_PUBLIC_API_URL`, que es la raíz del
servidor **sin** el prefijo `/api/v1` (el cliente HTTP lo agrega solo).

```bash
cp .env.example .env        # en Windows: copy .env.example .env
```

Elige el valor según dónde corras la aplicación:

| Dónde ejecutas la app | Valor de `EXPO_PUBLIC_API_URL` |
| --- | --- |
| Emulador de Android | `http://10.0.2.2:8000` (`10.0.2.2` es el host del PC visto desde el emulador) |
| Celular físico con Expo Go | `http://<IP-LAN-del-PC>:8000`, por ejemplo `http://192.168.1.10:8000` |
| Navegador (`npm run web`) o simulador de iOS | `http://localhost:8000` |
| Cualquiera, dejando que se infiera | deja la variable vacía o borra el archivo: el cliente deduce el host del servidor de Metro |

Cómo averiguar la IP de la LAN: `ipconfig` en Windows (fila «Dirección IPv4»),
`ip addr` o `ifconfig` en Linux y macOS. Es la misma IP que Expo muestra en el
código QR.

Dos condiciones para que el celular o el emulador alcancen la API:

1. `uvicorn` debe escuchar en todas las interfaces (`--host 0.0.0.0`). Con
   Docker ya es así.
2. El firewall del sistema debe permitir el puerto `8000`.

> Las variables `EXPO_PUBLIC_*` se incrustan al empaquetar. Si cambias el
> archivo con el servidor levantado, reinícialo con `npx expo start --clear`.

### 2.4 Arrancar

```bash
npm start
```

Luego, en la terminal de Expo: `a` abre el emulador de Android, `w` abre el
navegador, o escanea el código QR con Expo Go. `npm run ios` requiere macOS.

Si la pantalla de acceso responde «El servidor no respondió», el problema es
siempre uno de estos tres: la API no está levantada, `EXPO_PUBLIC_API_URL`
apunta a un host que el dispositivo no ve, o el firewall bloquea el puerto.

### 2.5 Credenciales de demostración

Las siembra `python -m app.seed` en el backend. Cada rol aterriza en su propia
sección (`RF-002 CA-03`):

| Rol | Correo | Contraseña | Pantalla inicial |
| --- | --- | --- | --- |
| Cliente | `cliente@aqualav.pe` | `Cliente1234` | `(cliente)/inicio` |
| Personal | `personal@aqualav.pe` | `Personal1234` | `(personal)/operacion` |
| Administrador | `admin@aqualav.pe` | `Admin1234` | `(admin)/servicios` |

El cliente de demostración ya tiene un vehículo registrado, así que se puede
reservar sin pasar antes por el alta de vehículos.

Un recorrido completo para la demostración: reserva con el cliente → busca esa
reserva con el personal por su código → check-in → «Finalizar servicio» →
«Registrar pago» → «Entregar vehículo».

---

## 3. Estructura de carpetas

El árbol de `src/app/` **es** el árbol de navegación. Hay un grupo por rol.

```
src/
  app/
    _layout.tsx                     Proveedores (sesión, tema) y control de acceso
    index.tsx                       Redirige según la sesión y el rol
    +not-found.tsx                  Ruta desconocida
    (auth)/
      _layout.tsx
      login.tsx                     RF-002
      registrar.tsx                 RF-001
    (cliente)/
      _layout.tsx                   Pestañas: inicio · servicios · vehículos · perfil
      inicio.tsx                    Próximas reservas y acceso rápido
      servicios.tsx                 RF-009  catálogo
      vehiculos.tsx                 RF-007  lista y alta
      perfil.tsx                    Datos de la cuenta y cierre de sesión
      reservar/[servicioId].tsx     RF-013 + RF-014  disponibilidad y confirmación
      reservas/index.tsx            RF-017  historial paginado
      reservas/[id].tsx             RF-022 seguimiento + RF-016 cancelación
    (personal)/
      _layout.tsx                   Pestañas: operación · buscar
      operacion.tsx                 Tablero del día por etapa
      buscar.tsx                    RF-019  búsqueda por código o placa
      reserva/[id].tsx              RF-019 + RF-021 + RF-024 + RF-026
    (admin)/
      _layout.tsx                   Pila
      servicios.tsx                 RF-010  catálogo completo
      servicio/[id].tsx             RF-010  alta y edición (`id === 'nuevo'` crea)
  components/                       Componentes de presentación
    ui/                             Primitivas: Button, Card, TextField, Toast, Badge…
    screen.tsx auth-screen.tsx estado-vista.tsx confirmar-dialogo.tsx
    estado-badge.tsx linea-tiempo.tsx reserva-card.tsx selector.tsx themed-text.tsx
  constants/theme.ts                Colores, espaciados, radios y tipografías
  hooks/                            use-auth · use-theme · use-toast · use-async
  services/                         Acceso a la API (única capa que sabe de HTTP)
  types/                            Espejo de los esquemas de la API
  utils/                            validation · formato · estados
assets/                             Imágenes e íconos
```

El alias `@/*` apunta a `src/*` y `@/assets/*` a `assets/*` (ver
`tsconfig.json`).

---

## 4. Convenciones

**Las pantallas no tienen lógica de negocio.** Una pantalla lee parámetros,
llama a un servicio, decide qué rama dibujar (cargando, error, vacío,
contenido) y muestra el resultado. Las reglas las valida el backend; el cliente
solo replica las validaciones de formulario para avisar antes (`RNF-009 M1`).

**`services/` es la única capa que sabe de dónde vienen los datos.** Ninguna
pantalla llama a `fetch` ni conoce una ruta HTTP: importa una función de
`@/services/*.service`. `api-client.ts` concentra la URL base, el token, el
refresco de sesión y la traducción de cada error del backend a `ApiError`
(`status`, `codigo`, `detalles`).

**La interfaz se habilita por permiso, nunca por nombre de rol.** Se usa
`tiene('pago:registrar')` y no `rol === 'personal'` (principio **P5** del SRS).
El rol solo decide a qué sección se entra tras iniciar sesión.

**Los botones de una reserva salen de `transiciones_permitidas`.** Esa lista la
calcula la API desde la tabla `transicion_estado` filtrada por los permisos de
quien pregunta. La pantalla la recorre y dibuja un botón por cada estado
permitido; un estado nuevo en la tabla aparece en la app sin desplegar código
(principio **P3**, `RF-021 CA-03`).

**Estilado.** `StyleSheet.create` al final de cada archivo y colores desde
`useTheme()`. Nada de colores fijos ni de números mágicos dentro de los
componentes: todo sale de `constants/theme.ts`.

**Acciones irreversibles.** Cancelar una reserva, registrar un pago, entregar
un vehículo, desactivar un servicio y cerrar sesión piden confirmación con
`<ConfirmarDialogo />` (`RNF-009 M2`). Una validación fallida nunca borra lo ya
escrito (`RNF-009 M4`).

**Cobros.** La clave de idempotencia se genera **una sola vez por intento de
cobro** (en un `useRef`) y se reenvía igual en cada reintento, para que un
tiempo de espera agotado no genere un segundo pago (`RF-026 CA-02`).

**Rendimiento en listas.** Componentes de ítem memorizados, `keyExtractor` y
`renderItem` estables, sin objetos de estilo en línea dentro de los ítems,
`Pressable` en lugar de `TouchableOpacity` y nunca `&&` con un valor «falsy»
para renderizar condicionalmente (un `0` suelto rompe React Native): siempre un
ternario o un `Boolean(...)` explícito.

**Nombres.** Archivos y carpetas en `kebab-case`, componentes en `PascalCase`,
y los campos del dominio en español y `snake_case`, exactamente como los emite
la API.

---

## 5. Scripts

| Comando | Qué hace |
| --- | --- |
| `npm start` | Levanta el servidor de desarrollo |
| `npm run android` | Levanta y abre en Android |
| `npm run ios` | Levanta y abre en iOS (solo macOS) |
| `npm run web` | Levanta y abre en el navegador |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint sobre todo el proyecto |
| `npm run doctor` | Verifica las versiones de dependencias contra el SDK |

---

## 6. Notas

- Las carpetas nativas `ios/` y `android/` no se versionan: Expo las genera con
  `npx expo prebuild` cuando hace falta un módulo nativo propio.
- `expo-env.d.ts` y `.expo/` son generados y están en `.gitignore`.
- Proyecto académico: sin EAS, sin compilaciones para tiendas y sin
  configuración de producción.

## 7. Documentación

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native](https://reactnative.dev)
- `SRS-AquaLav-MVP-v0.1.md` — requisitos, reglas de negocio y criterios de
  aceptación.
