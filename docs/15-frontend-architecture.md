# HSE OPS AI — Frontend Architecture

## Technology Stack

| Package | Version | Role |
|---------|---------|------|
| React | 18.3 | UI framework |
| Vite | 5.4 | Build tool, dev server |
| TypeScript | 5.5 | Type safety |
| Tailwind CSS | 3.4 | Utility-first styling |
| Lucide React | 0.344 | Icon library |
| @supabase/supabase-js | 2.57 | Database + Auth client |
| Zustand (shim) | local | Global state management |
| react-router-dom (shim) | local | Client-side routing |
| date-fns (shim) | local | Date formatting |
| react-markdown (shim) | local | Markdown rendering in chat |

Note: `zustand`, `react-router-dom`, `date-fns`, and `react-markdown` are served as local shims under `src/lib/` to avoid WebContainer package resolution issues. They provide identical APIs to the npm packages.

## Directory Structure

```
src/
├── App.tsx                    # Root: router, RequireAuth guard
├── main.tsx                   # Entry point
├── index.css                  # Tailwind directives + custom CSS vars
├── vite-env.d.ts
│
├── components/
│   └── layout/
│       ├── Header.tsx         # Top bar: page title, user info
│       ├── Layout.tsx         # Shell: sidebar + header + <Outlet>
│       └── Sidebar.tsx        # Navigation with role-based visibility
│
├── pages/
│   ├── LoginPage.tsx          # Auth form with demo accounts
│   ├── DashboardPage.tsx      # Stats overview, recent activity
│   ├── ChatPage.tsx           # AI chat interface + streaming
│   ├── KnowledgePage.tsx      # Document search and browse
│   ├── EmergencyPage.tsx      # Emergency response cards
│   ├── PTWPage.tsx            # Permit to work guidance + management
│   ├── RiskAssessmentPage.tsx # JSA/TRA create + list
│   ├── ToolboxTalkPage.tsx    # Generate + manage toolbox talks
│   ├── ObservationsPage.tsx   # Submit + manage safety observations
│   ├── IncidentPage.tsx       # Incident investigation + 5-Why
│   ├── LearningPage.tsx       # Modules, quizzes, competency
│   ├── AnalyticsPage.tsx      # Usage charts, risk trends
│   ├── GovernancePage.tsx     # AI response review queue
│   └── AdminPage.tsx          # User management, system config
│
├── lib/
│   ├── supabase.ts            # Supabase client singleton
│   ├── router.tsx             # react-router-dom shim
│   ├── zustand.ts             # Zustand create() shim
│   ├── date-fns.ts            # date-fns format() shim
│   └── react-markdown.tsx     # Markdown renderer shim
│
├── stores/
│   └── authStore.ts           # Global auth state (user, login, logout)
│
├── services/
│   └── mockAI.ts              # Mock RAG: keyword matching + streaming simulation
│
└── types/
    └── index.ts               # All TypeScript interfaces + RBAC constants
```

## Routing

Defined in `App.tsx` using the local router shim (BrowserRouter → History API):

```
/login              → LoginPage (public; redirects to /dashboard if already logged in)
/dashboard          → DashboardPage (all authenticated)
/chat               → ChatPage (all authenticated; auditor excluded via sidebar only)
/knowledge          → KnowledgePage (all authenticated)
/emergency          → EmergencyPage (all authenticated)
/ptw                → PTWPage (all authenticated)
/risk-assessment    → RiskAssessmentPage (admin, hse_manager, hse_advisor, supervisor, auditor)
/toolbox            → ToolboxTalkPage (all authenticated)
/observations       → ObservationsPage (all authenticated)
/incident           → IncidentPage (admin, hse_manager, hse_advisor, supervisor, auditor)
/learning           → LearningPage (all authenticated)
/analytics          → AnalyticsPage (admin, hse_manager, auditor)
/governance         → GovernancePage (admin, hse_manager, hse_advisor, auditor)
/admin              → AdminPage (admin only)
/ or *              → Redirect to /dashboard (if logged in) or /login
```

Route role enforcement is done by wrapping pages in `<RequireAuth roles={[...]}>`. The `/chat` route has no `RequireAuth` role restriction at the route level — auditor exclusion is enforced at the Sidebar nav-item visibility level via `ROLE_PERMISSIONS` only. If required, `/chat` should be wrapped with `RequireAuth roles={['admin','hse_manager','hse_advisor','supervisor','field_worker','contractor']}` in a future iteration.

## State Management

Only one global store: `useAuthStore` (Zustand).  
All other state is component-local (useState, useReducer) or fetched per-page (useEffect + Supabase query).

No TanStack Query in current implementation — data is fetched in useEffect hooks per page. TanStack Query is planned for Phase 4 to enable caching and background refetching.

## Component Conventions

- All pages are default exports from `src/pages/`
- Pages use `useAuthStore()` to get the current `user` for role checks and ownership
- All Supabase queries handle error and empty states explicitly before rendering
- Loading states use a consistent `loading` boolean + skeleton or spinner
- Error states show inline error messages (no crashes)

## Color System (Tailwind Custom Theme)

Defined in `tailwind.config.js`:
- `navy-{50..950}` — dark blue scale (sidebar, headers)
- `flame-{50..950}` — orange-red scale (brand accent, CTAs)
- Standard Tailwind: blue, green, yellow, red, gray

## CSS Custom Properties

```css
/* src/index.css */
:root {
  --color-navy-900: #0f172a;
  --color-flame-500: #f97316;
}

.nav-item { @apply flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all; }
.nav-item-active { @apply bg-flame-500/10 text-flame-400; }
.nav-item-inactive { @apply text-navy-400 hover:text-white hover:bg-white/5; }
```

## Build Configuration

`vite.config.ts`:
- `@vitejs/plugin-react` for JSX transform and HMR
- `resolve.alias` maps package names to local shims (zustand, react-router-dom, date-fns, react-markdown)
- `optimizeDeps.exclude: ['lucide-react']` — prevents pre-bundling issues

## Type Safety Rules

- No `any` — use `unknown` and narrow with type guards
- All Supabase query results typed with table interfaces from `src/types/index.ts`
- All props interfaces defined inline or in the same file as the component
- `maybeSingle()` used instead of `single()` to avoid throwing on empty results
