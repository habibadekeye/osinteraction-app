# HSE OPS AI — Authentication & Security

## Auth Provider

**Supabase Auth** — email/password, JWT-based.  
Phase 6: NEPL SSO (SAML 2.0 / OIDC) integration.

## Login Flow (Current Implementation)

```
User enters email directly (e.g. manager@safeops.demo)
    ↓
supabase.auth.signInWithPassword({ email, password })
    ↓
Supabase issues access token (JWT) + refresh token (httpOnly cookie)
    ↓
authStore.login() fetches profile from profiles table (maybeSingle)
    ↓
Navigate to /dashboard
```

Note: Employee ID login is NOT currently implemented. The login form accepts email directly. Employee IDs are displayed for reference in the demo accounts list on the login page but cannot be used as the login identifier.

## Token Strategy

| Token | Storage | Lifetime | Managed By |
|-------|---------|---------|-----------|
| Access Token (JWT) | Memory (Zustand) — NEVER localStorage | 1 hour | Supabase Auth |
| Refresh Token | httpOnly cookie (Supabase handles this) | 7 days | Supabase Auth |

The access token contains: `{ sub: uuid, role: 'authenticated', iat, exp }`  
The user's HSE role (`admin`, `hse_manager`, etc.) is in the `profiles` table, not the JWT.

## Auto-Refresh

`supabase.createClient` is configured with `autoRefreshToken: true`. The Supabase SDK automatically refreshes the access token before expiry using the refresh token cookie.

## onAuthStateChange Safety Pattern

The `onAuthStateChange` listener in `authStore.ts` is wrapped in an async IIFE to prevent deadlocks:

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  (async () => {
    // async work here — safe because not blocking the listener
  })();
});
```

Never call `supabase.auth.*` inside an onAuthStateChange callback synchronously — it can cause deadlocks.

## RBAC Implementation

Roles are stored in `profiles.role`. The `ROLE_PERMISSIONS` map in `authStore.ts` defines feature access:

```typescript
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['*'],
  hse_manager: ['chat', 'knowledge', 'knowledge.write', 'risk', 'ptw', 'toolbox', 'incident', 'observation', 'emergency', 'learning', 'analytics', 'governance', 'reports'],
  hse_advisor: ['chat', 'knowledge', 'knowledge.write', 'risk', 'ptw', 'toolbox', 'incident', 'observation', 'emergency', 'learning', 'governance'],
  supervisor: ['chat', 'knowledge', 'risk', 'ptw', 'toolbox', 'incident', 'observation', 'emergency', 'learning'],
  field_worker: ['chat', 'knowledge', 'ptw', 'toolbox', 'observation', 'emergency', 'learning'],
  contractor: ['chat', 'knowledge', 'ptw', 'toolbox', 'observation', 'emergency', 'learning'],
  auditor: ['knowledge', 'analytics', 'governance', 'reports'],
};
```

`canAccess(feature)` checks `permissions.includes('*') || permissions.includes(feature)`.  
Routes are protected by `<RequireAuth roles={[...]}><Page /></RequireAuth>` in `App.tsx`.

## Route Guards

```tsx
// App.tsx
function RequireAuth({ children, roles }) {
  const { user, initialized } = useAuthStore();
  if (!initialized) return null;           // wait for session check
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
```

## Password Security (Phase 6 / When Custom Auth is Built)

| Requirement | Value |
|-------------|-------|
| Hashing | bcrypt, cost factor 12 |
| Minimum length | 8 characters |
| Complexity | 1 uppercase, 1 lowercase, 1 number, 1 special char |
| Account lockout | 5 failed attempts → 30-minute lock |
| Password expiry | 90 days |

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Login attempts | 5 per 15 minutes per IP |
| AI chat queries | 10 per minute per user |
| API general | 100 per minute per user |
| Document uploads | 10 per hour per user |

## Input Validation

- All API inputs validated with Zod schemas before processing
- File uploads: PDF only, max 10MB
- User-submitted text: stripped of HTML tags before storage
- SQL injection prevention: all DB access via Supabase client (parameterised queries)

## Security Headers (Production)

```
Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self' https://*.supabase.co https://*.openai.azure.com
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
```

## Sensitive Data Handling

- Azure OpenAI API key: stored as Supabase Edge Function secret — never in frontend or `.env`
- Supabase service role key: stored as Edge Function secret — never in frontend
- `VITE_SUPABASE_ANON_KEY`: safe to expose (RLS enforces access control)
- `VITE_SUPABASE_URL`: safe to expose
- User passwords: never stored in application layer (Supabase Auth handles hashing)

## Session Expiry UX

When session expires mid-use:
1. Supabase auto-refresh fails (refresh token expired)
2. `onAuthStateChange` fires with event='SIGNED_OUT'
3. Zustand `user` set to `null`
4. All protected routes redirect to `/login`
5. Login page shows "Your session has expired. Please sign in again."
