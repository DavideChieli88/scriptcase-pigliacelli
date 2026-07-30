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
| `animeunity` | Stub v2 | Disabled by default |

## Search

`GET /api/search?q=...` → JSON `{ results: [{ title, url, poster, year, genres, status }] }`


1. `GET /api/watch/{slug}/ep-N` → `videoUrl` embed
2. `GET embed/.../playlist?token&expires` (Referer = embed)
3. Decode payload XOR/base64 con il token → URL MP4/HLS diretto


## Feature flags

In `AppConfig`:

- `enableAnimeSaturn` (default `true`)
- `enableAnimeUnity` (default `false`)

Runtime toggle also in Settings (except Unity until implemented).

## AnimeSaturn notes

- Base URL: `https://www.animesaturn.net`
- Parser in `src/providers/animesaturn/parser.ts` is intentionally defensive
- HTML cached in IndexedDB with TTL
- If DOM changes, Home shows per-provider error banner and Mock still works

## Adding a provider

1. Create folder under `src/providers/<id>/`
2. Implement `ContentProvider` + isolated parser
3. Register in `src/app/bootstrap.ts`
4. Allow host in `tools/cors-proxy/server.mjs`
5. Add fixtures + unit tests

## Legal

Scraping third-party sites may violate ToS. Personal experimental use only. Prefer legitimate APIs/sources when available.
