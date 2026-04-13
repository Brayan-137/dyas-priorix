
  # Página web para estudiantes

  This is a code bundle for Página web para estudiantes. The original project is available at https://www.figma.com/design/QOP1jyDMSlcBGm9ovmEE6r/P%C3%A1gina-web-para-estudiantes.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Integración con el backend (añadido)

  Este frontend ahora consume APIs reales del backend usando variables de entorno Vite.

  - Variables esperadas (crear `.env` o usar `.env.local`):
    - `VITE_API_CORE_URL` (por defecto en `.env.example` a `http://localhost:8000/api`)
    - `VITE_API_GAMIFICATION_URL` (por defecto en `.env.example` a `http://localhost:8001/api`)
    - `VITE_AUTH_TOKEN_KEY` (opcional, por defecto `PRI_TOKEN`)

  - Archivos añadidos en `src/`:
    - `src/api/client.ts` — cliente fetch central con manejo de token en `localStorage`.
    - `src/services/authService.ts` — `login`, `register`, `logout`, `me`.
    - `src/services/activitiesService.ts` — lista, crear, actualizar, eliminar, completar.
    - `src/services/gamificationService.ts` — pet, experiencia, estadísticas semanales.
    - `src/utils/mappers.ts` — mapeos entre modelos front/backend (prioridades, fechas, duraciones).

    - Nuevas integraciones UI:
      - Botones de editar/eliminar en el popover del calendario ahora llaman a `updateActivity` / `deleteActivity` (implementado en `src/services/activitiesService.ts`).
      - Toaster de `sonner` añadido para notificaciones de éxito/error.
      - `StatsView` admite `weeklyData` desde el backend y mostrará datos reales si el endpoint `/statistics/weekly` devuelve la estructura esperada.

  - Comportamiento y supuestos:
    - Si el frontend usa `priority` como `high|medium|low`, el backend puede usar `alta|media|baja`. El mapeo se realiza en `src/utils/mappers.ts`.
    - Si el frontend usa `date`/`duration` y el backend usa `deadline`/`estimated_minutes`, el mapeo se realiza internamente; el frontend envía `deadline` y `estimated_minutes`.
    - Las peticiones se realizan contra `VITE_API_CORE_URL` y `VITE_API_GAMIFICATION_URL`.
    - El login espera que el endpoint `/auth/login` devuelva un `token` o `access_token`. Ese token se guarda en `localStorage` (clave configurable) y se añade en `Authorization: Bearer <token>`.

  - UI mínima de autenticación:
    - El botón en la barra lateral sirve para `Iniciar sesión` (abre modal) o `Cerrar sesión` (cuando ya está autenticado).
    - Si el backend requiere campos distintos o estructura de respuesta distinta para `login`/`me`, actualice `src/services/authService.ts` con el formato correcto.

  Si algo necesario no está mapeado o el backend devuelve un formato distinto, dejaré notas adicionales y el código está preparado para ajustar los campos en `src/utils/mappers.ts`.
  