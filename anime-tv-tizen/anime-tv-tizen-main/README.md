# Anime TV — Tizen 6.5

Web app personale/sperimentale per Samsung Smart TV (Tizen 6.5 / Chromium M85), UX ispirata a Netflix, navigazione a telecomando, aggregatore di contenuti tramite provider plugin.

> **Disclaimer legale**: questa applicazione è un shell generico. Gli adapter verso siti di terze parti sono **opzionali, disabilitati di default** e fuori dal core. L’uso di parser su contenuti protetti da copyright può violare termini di servizio e leggi locali. Usare solo in contesti leciti e personali.

## Stack

- **Vanilla TypeScript** + **Vite** (target `chrome85` / ES2019)
- **IndexedDB** (repository pattern) — non `localStorage` per i dati applicativi
- CSS con design tokens (nessun framework CSS pesante)
- Router in-app a stack + FocusEngine TV
- Vitest per unit test

## Requisiti

- Node.js 20+
- (Deploy TV) Tizen Studio / CLI, TV in Developer Mode

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173 — frecce + Enter + Esc=Back
npm test
npm run build        # output in dist/ (base relativa per packaging Tizen)
```

## Architettura (sintesi)

```
UI (pages/components)
  → Services (Catalog, Player, Progress, Settings, Cache)
    → ProviderRegistry / ContentProvider
    → IndexedDB repositories
```

Documentazione completa:

| Doc | Contenuto |
|-----|-----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Moduli, data flow, modelli |
| [docs/UX-TV.md](docs/UX-TV.md) | Focus, telecomando, schermate |
| [docs/PROVIDERS.md](docs/PROVIDERS.md) | Plugin provider e adapter |
| [docs/DEPLOY-TIZEN.md](docs/DEPLOY-TIZEN.md) | Packaging e install su TV |
| [docs/RISKS.md](docs/RISKS.md) | Rischi tecnici/legali |
| [docs/COMPATIBILITY-CHECKLIST.md](docs/COMPATIBILITY-CHECKLIST.md) | Checklist Tizen 6.5 |

## Funzionalità (M0–M4)

- Home con hero + rails virtualizzate (Continua, Ultimi, Recenti, Popolari)
- Dual mock provider (`mock` / `mock-alt`) per fallback multi-sorgente
- Adapter sperimentali M3 dietro flag (parser stub / siti sperimentali)
- Offline-first: cache metadata + rails locali + **Cambia sorgente** / Riprova
- Pipeline adapter: HttpClient → parsers → validate DTO → domain (zero parsing in UI)
- Ricerca, scheda anime, player HTML5 con resume
- Next-episode UX: titolo, countdown autoplay, Annulla/Back dismiss
- Lazy image loader con concurrency limit
- Progresso / watchlist / cronologia (IndexedDB)
- Impostazioni + debug log viewer
- Feature flag `VITE_ENABLE_EXTERNAL_ADAPTERS` (off)

## Tasti telecomando

| Azione | KeyCode tipici |
|--------|----------------|
| Frecce | 37–40 |
| Enter | 13 |
| Back | 10009 (Samsung), 27 (desktop) |
| Play / Pause | 415 / 19 / 10252 |

## Script

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + build produzione |
| `npm run preview` | Anteprima build |
| `npm test` | Unit test |
| `npm run typecheck` | Solo TypeScript |

## Cose da non fare su Tizen

- Hover come unica interazione
- Analytics / tracker di terze parti
- `localStorage` per progress/history
- Parsing HTML dentro i componenti UI
- Dipendenze pesanti non necessarie
- Ignorare il tasto Back
- Assumere supporto HLS/DRM come su desktop

## Licenza / uso

Progetto sperimentale personale. Nessuna garanzia. Nessun login, nessun backend obbligatorio, nessun analytics.
