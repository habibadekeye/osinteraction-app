# HSE OPS AI — Coding Standards

## Language & Tooling

- **TypeScript** — strict mode, no `any`, use `unknown` and narrow
- **ESLint** — `@typescript-eslint/recommended` + `react-hooks/recommended`
- **Prettier** — 2-space indent, single quotes, no semicolons (configured in `.prettierrc` if added)
- **Vite** — build tool, dev server

## File Naming

| Type | Convention | Example |
|------|-----------|---------|
| React components | PascalCase | `ChatPage.tsx`, `MessageBubble.tsx` |
| Utility/lib files | camelCase | `supabase.ts`, `router.tsx` |
| Type definition files | camelCase | `index.ts` |
| CSS files | camelCase | `index.css` |
| Edge Functions | kebab-case directory | `supabase/functions/chat/index.ts` |

## TypeScript Rules

```typescript
// NO — never use any
const data: any = await supabase.from('observations').select();

// YES — type the response
const { data } = await supabase.from('observations').select('*');
// data is typed as Tables<'observations'>[] | null

// NO — non-null assertion without check
const user = useAuthStore().user!;

// YES — check first
const { user } = useAuthStore();
if (!user) return null;
```

## Component Structure

```typescript
// File order within a component:
// 1. Imports
// 2. Interface/type definitions
// 3. Constants (outside component — no re-creation on render)
// 4. Default export component function
// 5. Sub-components (if tightly coupled and small)

// Props interfaces: inline in the same file
interface ToolboxCardProps {
  talk: ToolboxTalk;
  onConduct: (id: string) => void;
}

export default function ToolboxCard({ talk, onConduct }: ToolboxCardProps) {
  // hooks first
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // event handlers
  const handleConduct = async () => { ... };

  // render
  return <div>...</div>;
}
```

## State Management Rules

1. **No prop drilling beyond 2 levels** — lift to store or use composition
2. **No business logic in components** — extract to handler functions
3. **Only one global store** — `useAuthStore`. All other state is local or fetched per-page
4. **Data fetching in useEffect** — not in render path

## Supabase Query Patterns

```typescript
// ALWAYS use maybeSingle() not single() for optional lookups
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .maybeSingle(); // returns null if not found, not an error

// ALWAYS check error before using data
const { data, error } = await supabase.from('observations').select('*');
if (error) {
  console.error('Failed to load observations:', error.message);
  setError(error.message);
  return;
}
// data is guaranteed non-null here
setObservations(data);

// ALWAYS handle empty state
if (!data || data.length === 0) {
  setObservations([]);
  return;
}
```

## Error State Pattern

Every page that fetches data must handle 3 states:

```typescript
const [data, setData] = useState<Item[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

// In render:
if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error} />;
if (data.length === 0) return <EmptyState />;
return <DataList items={data} />;
```

## Comments Policy

Write no comments by default. Add a comment ONLY for:
- A non-obvious constraint or invariant
- A workaround for a specific bug (name the bug)
- Behaviour that would surprise a reader

Do NOT comment:
- What the code does (code should be self-describing)
- Which task/issue it was added for
- Obvious things like `// fetch users`

## Edge Function Rules

1. Always handle OPTIONS (CORS preflight) first
2. Always authenticate via `supabase.auth.getUser()` before any DB operation
3. Always return `{ success: true, data }` or `{ success: false, error: { code, message } }`
4. Always include `corsHeaders` on ALL responses (including errors)
5. Log errors with `console.error` + structured JSON

## CSS/Tailwind Rules

1. Use Tailwind utility classes — no custom CSS except for:
   - CSS custom properties (in `index.css`)
   - Reusable component classes defined with `@apply` in `index.css`
2. No inline `style={}` props — use Tailwind
3. Responsive prefix order: mobile → `sm:` → `md:` → `lg:` → `xl:`
4. Dark mode: use `bg-navy-*` and `text-navy-*` for dark surfaces — not `dark:` variants

## Import Order

1. React and React ecosystem (`react`, `react-dom`)
2. External packages (`lucide-react`, `@supabase/supabase-js`)
3. Internal lib (`../lib/supabase`, `../lib/router`)
4. Internal stores (`../stores/authStore`)
5. Internal types (`../types`)
6. Relative imports (`./Component`)
