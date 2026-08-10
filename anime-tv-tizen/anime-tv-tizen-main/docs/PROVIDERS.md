# Providers & adapters

## ContentProvider

Interface in `src/providers/types.ts`:

- `getHome()`, `search()`, `getAnimeDetails()`, `getEpisodes()`, `getStreamSources()`
- Returns `ProviderResult<T>` (ok/error) — never throws across UI boundary for expected failures

## Registry

`ProviderRegistry` registers providers at bootstrap (`src/app/bootstrap.ts`).

MVP always registers **`MockProvider`** (+ `mock-alt`).

## Feature flags

```bash
VITE_ENABLE_EXTERNAL_ADAPTERS=false  # master switch — register experimental shells
VITE_ADAPTER_ALPHA_ENABLED=false     # opt-in per adapter (requires master ON)
VITE_ADAPTER_BETA_ENABLED=false
# VITE_ADAPTER_ALPHA_BASE_URL=https://example.invalid
# VITE_ADAPTER_BETA_BASE_URL=https://example.invalid
```

Experimental adapters are **registered only** when the master flag is on, and **usable** only when their per-adapter enable flag is true. Parsers for alpha/beta are stubs until implemented.

## Multi-provider (M2)

Bootstrap registers two mock providers for local fallback UX:

- `mock` — Mock (dev)
- `mock-alt` — Mock B (dev)

`CatalogService.getHome` / `search` walk `ProviderRegistry.resolveChain(preferred)`.

## Experimental adapters (M3+)

Pipeline (strict separation):

```
HttpClient.fetch → HtmlParsers → DTO validate → mapToDomain → ContentProvider result
```

### AnimeSaturn (`animesaturn`)

Opt-in experimental adapter for `www.animesaturn.net`.

```bash
VITE_ENABLE_EXTERNAL_ADAPTERS=true
VITE_ADAPTER_ANIMESATURN_ENABLED=true
# optional: VITE_ADAPTER_ANIMESATURN_BASE_URL=https://www.animesaturn.net
```

| Route | Path |
|-------|------|
| Home | `/` — hero + ultime uscite + più visti |
| Search | `/filter?key=` |
| Details | `/anime/{slug}` — `a.ep-tile` episodes |
| Stream | `/anime/{slug}/ep-N` — `#watch-iframe` → resolve saturncdn playlist → MP4/HLS |

Notes:

- Stream: embed URL is resolved via `play.saturncdn.net/embed/{id}/playlist` (XOR payload) to a direct **MP4** (preferred) or HLS URL for `<video>`.
- Embed iframe remains last-resort fallback (often blocked by `frame-ancestors` outside animesaturn).
- Progress in embed mode is limited (no reliable media timeline).
- Dev: Vite proxies `/__as` → animesaturn and `/__sc` → saturncdn (injects Referer for playlist).
- Selectors may break when the site redesigns — keep the flag OFF if unstable.
- Legal: personal/experimental use only; site ToS / copyright may forbid scraping.

### AnimeUnity (`animeunity`)

Opt-in experimental adapter for `www.animeunity.so`.

```bash
VITE_ENABLE_EXTERNAL_ADAPTERS=true
VITE_ADAPTER_ANIMEUNITY_ENABLED=true
# optional: VITE_ADAPTER_ANIMEUNITY_BASE_URL=https://www.animeunity.so
```

| Route | Path |
|-------|------|
| Home | `/` — `.latest-anime-container` |
| Search | `/archivio?title=` — `records="[…]"` embedded JSON |
| Details | `/anime/{id}-{slug}` — `<video-player anime="…">` |
| Episodes | `/info_api/{id}/1?start_range=&end_range=` (max window 120; adapter paginates) |
| Stream | `/embed-url/{episodeDbId}` (plain embed URL; not `?episode=N` which SSR-always returns ep1) → resolve vixcloud `downloadUrl` → MP4 |

Embed iframe is blocked outside animeunity (`CSP frame-ancestors`); adapter fetches the embed HTML and plays the direct MP4.

| Module | Role |
|--------|------|
| `adapters/dto.ts` | Parse-time DTO shapes |
| `adapters/validate.ts` | Resilient validation → `ProviderError` |
| `adapters/dom.ts` | DOMParser helpers, absolutize URL, text sanitize |
| `adapters/mapToDomain.ts` | DTO → `AnimeSummary` / `Episode` / … |
| `adapters/ExternalHtmlProvider.ts` | Generic `ContentProvider` wiring |
| `adapters/_template/` | Fixture HTML contract + reference parsers |
| `adapters/experimental/alpha|beta/` | Configurable stubs (selectors not implemented) |

### Fixture HTML contract (for tests / new adapters)

Use `data-*` markers — see `createFixtureParsers`:

- `[data-anime-card][data-id][data-title]`
- `[data-feed="featured|recent|popular"]`
- `[data-anime-details]` + `[data-episode][data-number]`
- `[data-stream][data-url]`

Copy `_template` when adding a real site adapter; replace selectors only inside that folder.

## Adapter rules

1. Network I/O only in `HttpClient` (timeouts, retries, rate limit)
2. Parsers receive HTML/text and return DTOs (not domain models)
3. Always validate DTOs before mapping
4. Sanitize text (`stripHtml`) — never pipe raw HTML into UI `innerHTML`
5. Typed errors: `network | parse | empty | rateLimit | timeout | disabled`
6. **No UI imports** of parsers

## Fallback UX

If a provider fails:

- Elegant error state
- Retry
- Optional “change source” when multiple enabled providers exist

## Legal / maintenance

- Core must not hardcode third-party site DOM selectors
- Site-specific code stays under `providers/adapters/*`
- Prefer feature flags and easy disable when sites break
- Experimental adapters default OFF; enabling them is the operator’s responsibility
