# Anime TV — webOS personal aggregator

Aggregatore personale di anime per **LG webOS TV** (target 1920×1080, telecomando), scritto in **TypeScript vanilla + Vite**.

> **Disclaimer:** progetto sperimentale per uso personale. Non redistribuire, non pubblicare su LG Content Store, non esporre il proxy in Internet. I provider scrapano siti di terze parti: rispettane i termini e la legge sul copyright. L’app non ospita file video.

## Documentazione

- **[docs/GUIDA.md](docs/GUIDA.md)** — installazione Windows, collegare la TV, `npm run deploy`, proxy, come aggiungere provider/host fetch
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/PROVIDERS.md](docs/PROVIDERS.md)
- [docs/WEBOS.md](docs/WEBOS.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)

## Stack

- TypeScript + Vite (no React/Vue)
- IndexedDB (repository pattern)
- Provider plugin (`Mock`, `AnimeSaturn`, stub `AnimeUnity`)
- Focus manager per telecomando
- HTML5 video player con resume/progress
- Proxy CORS personale (`tools/cors-proxy`)

## Quick start (browser)

```bash
cd webos-anime-tv
npm install
npm run dev
```

Apri `http://localhost:5173`. Naviga con frecce / Enter / Esc (Back).

Per AnimeSaturn in dev:

```bash
# terminale 1
npm run proxy

# terminale 2
npm run dev
```

Il Vite server inoltra `/proxy` → `http://127.0.0.1:8787`.

## Script

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Build `dist/` + asset webOS |
| `npm run proxy` | Proxy CORS personale |
| `npm test` | Test unitari |
| `npm run package:webos` | Build + `ares-package` |
| `npm run install:webos` | Install + launch su `lg-tv` |
| `npm run deploy` | Package + install + launch |

## Architettura (sintesi)

Vedi [docs/GUIDA.md](docs/GUIDA.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/PROVIDERS.md](docs/PROVIDERS.md), [docs/WEBOS.md](docs/WEBOS.md), [docs/ROADMAP.md](docs/ROADMAP.md).

Layer principali:

- `src/ui` — pagine e componenti DOM
- `src/domain` — modelli e servizi
- `src/providers` — adapter sorgenti
- `src/persistence` — IndexedDB
- `src/player` — video + progresso
- `src/core` — platform, focus, router, http, logger

## Storage IndexedDB

Store: `settings`, `history`, `progress`, `watchlist`, `cache`, `providerState`, `lastSeen`.

**Non** si usa `localStorage` come storage principale.

## Deploy TV

1. Installa [webOS CLI](https://webostv.developer.lge.com/develop/tools/cli-installation) (`ares-*`).
2. Abilita Developer Mode sulla TV.
3. Configura il proxy sulla LAN (`http://<IP-PC>:8787`) nelle Impostazioni app.
4. `npm run build` → `ares-package dist` → `ares-install` → `ares-launch`.

Dettagli in [docs/WEBOS.md](docs/WEBOS.md).

## Licenza / uso

Uso personale. Nessuna garanzia. Nessun analytics esterno. Nessuna pubblicità.
