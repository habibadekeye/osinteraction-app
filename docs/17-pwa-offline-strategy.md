# HSE OPS AI — PWA & Offline Strategy

## Why Offline Matters

NEPL operates offshore platforms and remote onshore locations where internet connectivity is:
- Unreliable (satellite with 2–3 second latency)
- Frequently unavailable (maintenance windows, weather events)
- Metered (limited bandwidth on older rigs)

Field workers must be able to access emergency response cards, critical procedures, and offline toolbox templates without connectivity.

## PWA Implementation (Phase 5)

### Tooling
- `vite-plugin-pwa` — generates service worker from Vite build
- `workbox` — service worker strategies, background sync
- `idb` (npm) — IndexedDB wrapper for offline storage

### Service Worker Strategies

| Resource Type | Strategy | Cache Duration |
|--------------|----------|----------------|
| App shell (HTML/JS/CSS) | Cache First | Permanent (version controlled) |
| Static assets (fonts, icons) | Stale While Revalidate | 30 days |
| API responses (general) | Network First | 24 hours |
| Emergency cards | Cache First | 7 days |
| Critical procedures (top 20) | Cache First | 7 days |
| Toolbox talk templates | Cache First | 7 days |
| Chat messages | Network Only (no offline) | — |
| AI responses | Network Only | — |

### vite-plugin-pwa Config (Planned)
```typescript
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    runtimeCaching: [
      {
        urlPattern: /\/api\/emergency\/cards/,
        handler: 'CacheFirst',
        options: { cacheName: 'emergency-cards', expiration: { maxAgeSeconds: 7 * 24 * 3600 } },
      },
      {
        urlPattern: /\/api\/knowledge\/documents/,
        handler: 'NetworkFirst',
        options: { cacheName: 'knowledge-docs', expiration: { maxAgeSeconds: 24 * 3600 } },
      },
    ],
  },
})
```

## IndexedDB Stores

| Store | Contents | Max Size |
|-------|---------|---------|
| `chatMessages` | Last 50 messages per session (for history while offline) | ~5MB |
| `observations` | Pending offline submissions | ~1MB |
| `emergencyCards` | All 9 emergency scenario cards | ~500KB |
| `criticalDocuments` | Top 20 procedures (text only, no PDF) | ~10MB |
| `toolboxTemplates` | 10 common toolbox talk templates | ~1MB |
| `competencyProgress` | User quiz progress (not yet synced) | ~200KB |

Total target: < 20MB (well within 50MB storage limit).

## Background Sync (Phase 5)

### sync-observations
When a user submits a safety observation while offline:
1. Save to IndexedDB `observations` store with `syncStatus: 'pending'`
2. Register background sync: `sw.sync.register('sync-observations')`
3. When connectivity restored: Service worker sends pending observations to Supabase
4. On success: mark `syncStatus: 'synced'`, show success toast

### sync-chat-messages
For message queuing (if user sends a chat message while offline):
1. Save message to IndexedDB with `syncStatus: 'pending'`
2. Show "Sent when connected" indicator in chat
3. On reconnect: send to Edge Function, replace with real response

## Offline Detection

```typescript
// Global connectivity monitor
const [isOnline, setIsOnline] = useState(navigator.onLine);
useEffect(() => {
  const online = () => setIsOnline(true);
  const offline = () => setIsOnline(false);
  window.addEventListener('online', online);
  window.addEventListener('offline', offline);
  return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
}, []);
```

Show offline banner: `"You're offline — showing cached data"` when `isOnline = false`.

## Critical Offline Pages

These pages must work fully offline:
- `EmergencyPage` — emergency response cards (most critical)
- `KnowledgePage` — top 20 cached procedures in read-only mode

These pages show "Online required" message when offline:
- `ChatPage` — AI requires server
- `AnalyticsPage` — live data
- `GovernancePage` — live queue
- `AdminPage` — live user data

## App Installation (Home Screen)

The PWA manifest enables "Add to Home Screen":
```json
{
  "name": "HSE OPS AI",
  "short_name": "HSE OPS AI",
  "theme_color": "#f97316",
  "background_color": "#0f172a",
  "display": "standalone",
  "orientation": "portrait",
  "icons": [...]
}
```

Target: Field workers pin the app to their phone home screen for instant access.
