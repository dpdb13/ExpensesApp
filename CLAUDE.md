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
