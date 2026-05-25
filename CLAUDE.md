# ExpensesApp - Gastos Compartidos

## Descripcion
App para gestionar gastos compartidos entre amigos (estilo Tricount).

## Stack Tecnico
- **Frontend:** React + TypeScript + Vite
- **Backend:** Supabase (PostgreSQL + Auth)
- **Hosting:** GitHub Pages
- **PWA:** Service Worker con auto-actualizacion (SKIP_WAITING + controllerchange)

## URLs importantes
- **App:** https://dpdb13.github.io/ExpensesApp/
- **Repo:** https://github.com/dpdb13/ExpensesApp
- **Supabase:** https://yswhrwrgtzvdsxewkual.supabase.co

## Credenciales Supabase
- URL: `https://yswhrwrgtzvdsxewkual.supabase.co`
- Anon Key: en `.env.local`
- Base de datos password: guardada por Diego

## Estructura del proyecto
```
src/
  components/
    Auth.tsx          - Login/registro/reset password
    CreateGroup.tsx   - Crear nuevo grupo
    ProjectList.tsx   - Lista de grupos
    ProjectHeader.tsx - Cabecera del grupo activo
    ExpenseForm.tsx   - Formulario para anadir gastos
    ExpenseList.tsx   - Lista de gastos
    Summary.tsx       - Resumen de balances
    UserManager.tsx   - Gestionar participantes
  context/
    AuthContext.tsx   - Estado de autenticacion
    AppContext.tsx    - Estado de la app (proyectos, gastos)
  lib/
    supabase.ts       - Cliente de Supabase
  types.ts            - Tipos TypeScript
public/
  manifest-v11.json   - Manifest PWA
  sw.js               - Service Worker
  logo.png            - Logo de la app
  icon-192-v11.png    - Icono PWA 192x192
  icon-512-v11.png    - Icono PWA 512x512
  icon-maskable-*.png - Iconos maskable para Android
  apple-touch-icon.png - Icono para iOS
```

## Base de datos (Supabase)
Tablas:
- `projects` - Grupos de gastos
- `project_members` - Participantes de cada grupo
- `expenses` - Gastos
- `expense_shares` - Como se divide cada gasto

Todas las tablas tienen RLS (Row Level Security) activado.

## Comandos utiles
```bash
npm run dev      # Servidor de desarrollo
npm run build    # Compilar para produccion
npx gh-pages -d dist  # Desplegar a GitHub Pages
```

## Decisiones tecnicas importantes
- **ON DELETE CASCADE en FKs a auth.users/profiles**: El 15 feb 2026 se alteraron 4 FKs que no tenian CASCADE, lo que impedia borrar usuarios desde el dashboard de Supabase. FKs afectadas: `profiles.id`, `projects.created_by`, `project_members.user_id` (SET NULL), `expenses.created_by`. Ahora borrar un usuario borra en cascada todos sus datos.
- **History API para navegacion nativa (swipe back)**: pushState al entrar en proyecto, popstate para volver. Dependencia por `activeProject?.id` (no por referencia) para evitar pushes duplicados al añadir gastos/usuarios. Patron copiado de Basketball y Lysto.
- **Confirmacion al salir con formulario dirty**: `ExpenseForm` avisa a `App.tsx` via prop `onDirtyChange` cuando amount o title tienen datos. Cleanup en unmount para limpiar al cambiar de tab. Modal centrado con overlay.
- **replaceState tras borrar proyecto**: evita entradas huerfanas en el historial.

## Historial de sesiones

### 25 Mayo 2026 (sesión 2 — resumen personal por gasto, estilo Splitwise)
- **Feature nueva**: cada gasto muestra la perspectiva del usuario logueado (4 estados): "Debes X €" (rojo), "Te deben X €" (verde), "No has participado" (gris), "Pagaste" (gris, gasto solo para ti). El total pasa a la línea de info ("Álvaro pagó 80 €" / "Tú pagaste 60 €"). Settlements no llevan perspectiva.
- **Vinculación cuenta↔participante**: la columna `project_members.user_id` (existía vacía) ahora se usa. Cada usuario "reclama" su nombre la 1ª vez vía modal `WhoAmI` (pre-marca el nombre más parecido a su `display_name`/email). Se guarda en la nube → sincroniza entre dispositivos.
- **Funciones RPC nuevas en Supabase** (SECURITY DEFINER, mismo patrón que `join_project_by_invite_code`): `claim_member(member_id_input)` (valida acceso + nombre libre + 1 cuenta por grupo, soporta cambio de identidad) y `unclaim_member(p_project_id)`. Aplicadas con `apply_migration`.
- **Cambiar identidad**: sección "Tu identidad en el grupo" en ajustes (ProjectHeader) → "Cambiar" llama a `unclaimMember` y reabre el modal.
- **AppContext**: nuevo `myMemberId` (memo: participante cuyo `userId === user.id`), `claimMember`, `unclaimMember`. El `user_id` de cada miembro se conserva al cargar (antes se descartaba) y en el alta optimista.
- **Avisos de seguridad (advisors)**: las 2 funciones nuevas heredan los mismos WARN que las 6 ya existentes (`function_search_path_mutable` + ejecutable por anon). Verificado que con `auth.uid()` nulo no hacen nada. PENDIENTE opcional: pasada de seguridad a TODAS las funciones (set search_path + revoke anon) — no hacerlo solo en 2 de 8.
- **Caché v28 → v29**, build + `npx gh-pages -d dist`. Deploy requirió `gh auth switch --user dpdb13` (Nova `dpnovat` da 403) y restaurar a `dpnovat` después.
- **Decisión de proceso**: Diego NO quiere docs/specs `.md` persistentes para diseños — usar HTML temporal de mockup o explicar en el chat. (memoria global `feedback_no_persistent_design_docs`).

### 25 Mayo 2026
- **Bug botón compartir resuelto**: columna `projects.invite_code` era VARCHAR(10) pero el JS generaba códigos de 12 chars → Supabase rechazaba con "value too long". Migrada a TEXT (sin límite). Constante `INVITE_CODE_LENGTH = 12` extraída en AppContext.tsx para tener una única fuente de verdad. Schema SQL del repo ya estaba correcto (TEXT), el desfase era solo en el dashboard.
- **Reset password completado**: Auth no manejaba el evento `PASSWORD_RECOVERY` de Supabase, por lo que el link del email logueaba al usuario sin pedir contraseña nueva (problema de UX y seguridad). Añadido en AuthContext: estado `isRecoveryMode`, listener del evento, función `updatePassword`, reset en `SIGNED_OUT`. En Auth.tsx: vista nueva `'new-password'` con campos contraseña + confirmar. En App.tsx: condicional `if (isRecoveryMode) return <Auth initialView="new-password" />`.
- **Política de contraseñas unificada**: `PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/` aplicada a registro y a nueva contraseña. Login mantiene 6 chars min para retrocompatibilidad de cuentas viejas.
- **Supabase Auth URL Configuration revisada por Diego**: añadidos `https://dpdb13.github.io/ExpensesApp/**` y `https://dpdb13.github.io/RememberTheMilk/**` a Redirect URLs (necesario para que `redirectTo` del código sea respetado). Site URL seguía en `localhost:3000` (a cambiar por Diego cuando quiera).
- **UI cleanup en "Mis Grupos"**: quitada cifra de total de las cards (ProjectList.tsx) — el total solo se ve dentro del proyecto → Resumen. Borrados helpers `getProjectTotal`/`getCurrencySymbol` y CSS `.project-card-total` huérfano.
- **Fix scroll chaining en modales**: añadido `overscroll-behavior: contain` a `.modal-body` en App.css — evita que el scroll del modal se propague al body de la página detrás. Fix aplica a TODOS los modales de la app (detalle gasto, ajustes, compartir, formulario).
- **Botón "volver" rediseñado**: era un `←` circular igual que los iconos de acción (⚙️🔗🗑️), confuso visualmente. Cambiado a chevron `‹` sutil sin caja en `.btn-back` (App.css). Unificado en ProjectHeader y CreateGroup. Eliminado `.back-arrow` huérfano.
- **Pagador visible en Resumen mensual (móvil)**: en `Summary.tsx` el dato del payer ya estaba, pero CSS lo ocultaba en pantallas <768px. Restructurado a layout columna con `.expense-item-info` (title + "Pagado por: X" debajo, pequeño y muted). Visible en todos los breakpoints. Fallback "Desconocido" si user no existe (era `(undefined)`).
- **Cache v21 → v27** a lo largo de la sesión, ~5 deploys. Último incluye todos los cambios anteriores.
- **Técnica de debug usada**: instrumentar handleShare y generateInviteLink con `alert()` y desplegar versión debug temporal — para encontrar bugs en PWA donde F12 no es práctico para usuarios sin perfil técnico. Quitar tras diagnosticar.

### 15 Febrero 2026 (sesion 2)
- Navegacion por swipe (History API) implementada: pushState/popstate con debounce (navGuardRef + requestAnimationFrame)
- Confirmacion al salir si el formulario de gastos tiene datos sin guardar
- Proteccion PWA: re-push en lista de proyectos para no salir de la app
- ProjectHeader.handleBack cambiado de selectProject(null) a window.history.back()
- Bugs encontrados y corregidos en code review (Opus):
  - Push duplicado: dependencia cambiada de activeProject (referencia) a activeProject?.id (valor estable)
  - Historial huerfano al borrar proyecto: replaceState tras delete
  - formDirtyRef no se limpiaba al cambiar de tab: cleanup en unmount de ExpenseForm
- Cache v14→v15, desplegado a GitHub Pages, commit y push

### 15 Febrero 2026 (sesion 1)
- Fix: foreign keys a `auth.users` y `profiles` sin ON DELETE CASCADE impedian borrar usuarios desde Supabase dashboard. Alteradas 4 constraints (profiles→CASCADE, projects→CASCADE, project_members→SET NULL, expenses→CASCADE)

### 3 Febrero 2026
- Service Worker con auto-actualizacion (copiado patron de Lysto/Basketball):
  - Listener `SKIP_WAITING` en sw.js
  - `updatefound` + `controllerchange` en index.html
  - `self.clients.claim()` sacado fuera del waitUntil
- Optimizacion para navegacion por gestos en movil/tablet:
  - `overscroll-behavior: none` para evitar bounce elastico
  - `-webkit-tap-highlight-color: transparent` global (antes solo en algunos botones)
  - `env(safe-area-inset-*)` en body (top, left, right)
  - `100dvh` para altura dinamica del viewport
- Cache bumpeado a splitly-v14, desplegado a GitHub Pages

### 28 Enero 2026
- Implementada autenticacion con Supabase (login, registro, reset password)
- Migrado almacenamiento de localStorage a Supabase
- Configuradas politicas RLS para seguridad
- App renombrada a **Splitly**
- Creado icono personalizado desde cero (grafico de tarta + $ + personas, fondo azul-gris)
- Iconos adaptados para Android (maskable) e iOS (apple-touch-icon)
- Configurada PWA con manifest e iconos v11
- Desplegado a GitHub Pages

**Aprendizajes sobre PWA y cache:**
- Chrome cachea muy agresivamente los iconos y manifest de PWAs
- Para forzar actualizacion: cambiar nombres de archivos (icon-v11.png) y manifest
- El `start_url` en manifest identifica la app - cambiarlo crea "nueva" app
- Para usuarios con cache vieja: Ajustes Android > Apps > [app] > Desinstalar, luego Chrome > Config sitio > Borrar datos

**Funcionalidad de compartir proyectos:**
- Tabla `project_shared_users` para registrar usuarios invitados
- Boton 🔗 en cabecera genera enlace con codigo unico
- URL con `?join=CODIGO` permite unirse automaticamente
- Politicas RLS actualizadas para evitar recursion infinita

**Optimizaciones realizadas:**
- Imports limpios (sin React innecesario)
- useMemo para activeProject
- CSS responsive completo (360px a 1024px+)
- Service Worker con cache inteligente (Cache First para assets, Network First para HTML)
- Touch targets de 44px minimo
- Soporte para prefers-reduced-motion y prefers-contrast

**Paleta de colores de la app:**
- Primary: #7C6EF6 (morado)
- Background: #0D0D12 / #1A1A24
- Accent teal: #00D9C4
- Success: #00D9A5
- Danger: #FF6B6B
