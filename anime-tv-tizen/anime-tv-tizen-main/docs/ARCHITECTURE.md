# Architecture

## Principles

1. **UI never parses** — HTML/DOM parsing lives only in provider adapters.
2. **Providers are plugins** — core depends on `ContentProvider`, not on a site.
3. **Persistence is IndexedDB** — versioned schema + repositories.
4. **TV-first input** — centralized remote + spatial focus engine.
5. **No third-party analytics** — logger is local/console only.

## Layers

```
src/
  ui/           pages + presentational components (DOM)
  navigation/   FocusEngine, RemoteInput, KeyMap
  router/       stack router (no History API dependency)
  services/     Catalog, Player, Progress, Settings, Cache, ImageLoader
  providers/    ContentProvider, MockProvider, HttpClient, adapters/
  persistence/  IDB open/migrate + repositories
  domain/       models, errors, ids
  state/        EventBus
  app/          bootstrap, App shell, config
  utils/        logger, debounce, throttle, sanitize, time
```

## Data flow — Home

1. `HomePage.show()` → skeleton solo al primo load o `homeDirty === 'full'`; con `homeDirty === 'local'` aggiorna Continua/Ultimi/hero senza smontare le rail del provider
2. `CatalogService.getHome()` prova cache metadata (TTL 2h) → rete → stale cache → rail locali
3. Merge con `ProgressRepository` / `HistoryRepository`
4. FocusEngine ripristina focus memorizzato (o hero CTA)

## Milestone status

- **M0** Scaffold — done
- **M1** MVP usabile offline-first — done
- **M2** Provider framework hardening — done
- **M3** Adapter sperimentali (flag OFF) — done
- **M4** Polish TV — rail virtualization, image loader, next-episode UX

## M3 notes

- `ExternalHtmlProvider`: fetch → parse → validate DTO → domain
- Fixture parsers (`data-*` contract) + unit tests
- Experimental shells `ext-alpha` / `ext-beta` (unimplemented parsers, disabled)
- Master flag `VITE_ENABLE_EXTERNAL_ADAPTERS` + per-adapter enable/base URL

## Data flow — Playback

1. Navigate to `player` with `animeId` + `episodeId`
2. Load details + stream sources via CatalogService
3. `PlayerService.load` attaches HTML5 video, seeks resume time
4. Heartbeat every N ms + pause/visibility/back flush to ProgressTracker
5. Completion when `percent >= completionThreshold`
6. Next-episode autoplay or prompt based on settings

## Domain models

See `src/domain/models.ts`:

- `AnimeSummary`, `AnimeDetails`, `Episode`
- `StreamSource`, `WatchProgress`, `ContinueWatchingItem`
- `HomeFeed`, `AppSettings`, `HistoryEntry`, `WatchlistEntry`

IDs are canonical: `` `${providerId}:${externalId}` ``.

## IndexedDB (v1)

Database: `anime-tv-db`

| Store | keyPath | Purpose |
|-------|---------|---------|
| settings | key | App settings |
| history | id | Last seen anime |
| progress | episodeId | Playback progress |
| watchlist | animeId | Favorites |
| cache | key | Metadata TTL cache |
| providerState | providerId | Health / backoff |

Migrations run in `src/persistence/db.ts` via `onupgradeneeded`.

## Events

`EventBus` (`src/state/EventBus.ts`) — lightweight pub/sub:

- `route:change`, `focus:change`, `progress:update`
- `settings:change`, `player:time`, `player:state`, `provider:error`

## Compatibility target

- Build target: Chrome 85 / ES2019
- Avoid relying on APIs newer than M85 without bundler support
- Relative `base: './'` for Tizen packaged paths
