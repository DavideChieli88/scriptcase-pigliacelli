# Checklist compatibilità Tizen 6.5 / Chromium M85

## Build & runtime

- [x] TypeScript target ES2019 / Vite `chrome85`
- [x] `base: './'` per path relativi nel package
- [x] Nessuna dipendenza runtime npm obbligatoria (solo Vite/Vitest in dev)
- [x] No React / no state manager pesante
- [x] No analytics / tracker di terze parti
- [x] `config.xml` con privilege internet + tv.inputdevice
- [x] Icona e content `index.html` previsti nel package

## Input

- [x] Mapping frecce / Enter / Back Samsung (`10009`)
- [x] Play / Pause / PlayPause / FF / Rewind gestiti in player
- [x] Listener centralizzato (`RemoteInput`)
- [x] Nessuna dipendenza da hover

## Navigazione

- [x] Router a stack (Back pop)
- [x] FocusEngine spaziale
- [x] Focus memory per riga
- [x] Scroll verso elemento focalizzato

## Persistenza

- [x] IndexedDB schema versionato
- [x] Store: settings, history, progress, watchlist, cache, providerState
- [x] Progress save periodico + pause/exit
- [x] Soglia completamento configurabile
- [x] Nessun uso di `localStorage` come storage principale app

## Provider

- [x] Interfaccia `ContentProvider`
- [x] Registry + MockProvider (+ mock-alt)
- [x] resolveChain / fallback multi-provider
- [x] Temporary backoff in providerState
- [x] Adapter template isolato + fixture parsers
- [x] Experimental alpha/beta shells (flag OFF)
- [x] DTO validation layer
- [x] Feature flag external adapters OFF di default
- [x] HttpClient con timeout / retry backoff / rate limit
- [x] Debug log ring buffer (rete/provider/cache)

## UI / UX

- [x] Layout pensato 1920×1080
- [x] Testi grandi, contrasto alto, focus ring chiaro
- [x] Skeleton / empty / error states
- [x] Player con resume
- [x] Nessuna pubblicità in UI

## Performance

- [x] Lazy image loading (IntersectionObserver + fallback)
- [x] Bounded concurrent image probes
- [x] Horizontal rail virtualization (sliding DOM window)
- [x] Debounce search
- [x] Throttle progress heartbeat
- [x] Episode list paging (light virtualization)
- [x] `content-visibility` / `contain` on rails & posters

## Verifica su device (manuale)

- [ ] Install `.wgt` su TV Developer Mode
- [ ] Navigazione Home → Details → Player → Back×2
- [ ] Resume progresso dopo riapertura app
- [ ] Memoria stabile dopo 20+ navigazioni e poster load
- [ ] Scroll rails lunghe senza stutter (virtual window)
- [ ] Next-episode: countdown autoplay / Annulla / Back dismiss
- [ ] Rete lenta: skeleton e error/retry accettabili

## Cose da non fare (reminder)

- [ ] Non aggiungere CDN analytics
- [ ] Non parsare HTML in UI
- [ ] Non usare localStorage per progress
- [ ] Non assumere API post-M85 senza transpile/polyfill
- [ ] Non bloccare il main thread con parse DOM enormi
