# Providers

## Contract

Every provider implements `ContentProvider`:

- `getHome()`, `search()`, `getAnimeDetails()`, `getEpisodes()`, `getStreamSources()`
- Always returns `ProviderResult<T>` (`ok` / typed `ProviderError`)

## Registered providers

| ID | Status | Notes |
|----|--------|-------|
| `mock` | MVP | Catalogo locale + video sample |
| `animesaturn` | MVP | Home/search/details + stream via `/api/watch` + decode playlist |
| `animeunity` | MVP | Home/search/details/stream; **fetch diretto senza proxy** |

## Search

AnimeSaturn: `GET /api/search?q=...`

AnimeUnity: `GET /archivio?title=...` → JSON in `records` su `#archivio`

### AnimeSaturn stream

1. `GET /api/watch/{slug}/ep-N` → `videoUrl` embed
2. `GET embed/.../playlist?token&expires` (Referer = embed)
3. Decode payload XOR/base64 con il token → URL MP4/HLS diretto

### AnimeUnity stream

1. `GET /anime/{id}-{slug}/{episodeId}` → `video-player[embed_url]` (vixcloud)
2. Parse `window.video` (url/token/expires) → playlist HLS


## Feature flags

In `AppConfig`:

- `enableAnimeSaturn` (default `true`)
- `enableAnimeUnity` (default `true`)

Runtime toggle in Settings for all registered providers.

## Proxy

- **AnimeSaturn** richiede il proxy CORS personale (PC LAN).
- **AnimeUnity** chiama il sito in diretto (`useProxy=false`): su TV packaged di solito basta; in browser desktop può fallire per CORS.

## AnimeSaturn notes

- Base URL: `https://www.animesaturn.net`
- Parser in `src/providers/animesaturn/parser.ts` is intentionally defensive
- HTML cached in IndexedDB with TTL
- If DOM changes, Home shows per-provider error banner and Mock still works

## AnimeUnity notes

- Base URL: `https://www.animeunity.so`
- Parser in `src/providers/animeunity/parser.ts`
- Episodi via `/info_api/{id}/1?start_range=&end_range=` (pagine da 120)
- Stream host: `vixcloud.co`

## Adding a provider

1. Create folder under `src/providers/<id>/`
2. Implement `ContentProvider` + isolated parser
3. Register in `src/app/bootstrap.ts`
4. Allow host in `tools/cors-proxy/server.mjs` (se usi proxy)
5. Add fixtures + unit tests

## Legal

Scraping third-party sites may violate ToS. Personal experimental use only. Prefer legitimate APIs/sources when available.
