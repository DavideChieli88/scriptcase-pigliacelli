# Architecture

## Goals

- Modular, testable, TV-first
- Core independent from webOS APIs (platform adapter)
- Clear separation: UI / domain / providers / persistence / player
- Local-first state in IndexedDB
- Graceful provider failure

## Layers

```text
UI pages/components
    ↓
Domain services (Home, Search, Library)
    ↓
ProviderRegistry → ContentProvider (mock / animesaturn / …)
    ↓
HttpClient → (optional) personal CORS proxy
Persistence repositories ← Player / ProgressTracker
PlatformAdapter ← key / lifecycle / exit
```

## Navigation & focus

- `Router` + `HistoryManager` own the route stack
- Back is handled centrally in `bootstrap.wireInput`
- `FocusManager` + `FocusGraph` + `FocusMemory` restore focus per scope
- Spatial nearest-neighbor for arrow keys; same-group preferred horizontally

## Networking

- Single `HttpClient` with timeout, limited retries, gentle rate limiting
- Real providers fetch via proxy: `{proxyBaseUrl}/fetch?url=…`
- Parsers never touch the DOM UI; they return domain models

## Persistence

- Versioned IndexedDB (`DB_VERSION`)
- Repositories stamp `createdAt` / `updatedAt`
- Cache TTL + max entries eviction
- Settings gate debug logging, preferred provider, proxy URL, thresholds

## Player

- `PlayerService` wraps HTML5 `<video>`
- `ProgressTracker` heartbeats progress to IndexedDB
- Resume from last `currentTime` when not completed
- Next-episode prompt when autoplay is enabled
