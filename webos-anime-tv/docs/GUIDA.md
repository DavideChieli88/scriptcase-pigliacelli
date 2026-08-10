# Guida: installazione, deploy e nuovi provider

Documento operativo per questo progetto su **Windows + LG webOS TV**.  
Dettagli tecnici aggiuntivi: [WEBOS.md](./WEBOS.md), [PROVIDERS.md](./PROVIDERS.md), [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 1. Prerequisiti

| Cosa | Note |
|------|------|
| **Node.js LTS** | Installazione tipica: `C:\Program Files\nodejs\` |
| **webOS CLI** (`ares-*`) | `npm install -g @webosose/cli` (o SDK LG). Comandi: `ares-setup-device`, `ares-package`, `ares-install`, `ares-launch`, `ares-novacom` |
| **TV e PC stessa LAN** | Stesso Wi‑Fi; evita rete guest / AP isolation |
| **Developer Mode** sull’LG | App Developer Mode → sessione attiva, **Key Server ON** |
| **Tailscale / VPN** | Spesso bloccano la LAN: disconnettili prima di ping/install |

### PATH in PowerShell (Cursor)

Se `npm.cmd` / `ares-*.cmd` non sono riconosciuti:

```powershell
$env:Path = "C:\Program Files\nodejs;C:\Users\dvdch\AppData\Roaming\npm;" + $env:Path
```

Se i `.ps1` di npm sono bloccati dalla ExecutionPolicy, usa sempre **`npm.cmd`** (non `npm`).

Lavorare sempre dalla cartella app:

```powershell
cd c:\Users\dvdch\Desktop\Projects\webos-anime-tv
```

---

## 2. Installazione progetto

```powershell
$env:Path = "C:\Program Files\nodejs;C:\Users\dvdch\AppData\Roaming\npm;" + $env:Path
cd c:\Users\dvdch\Desktop\Projects\webos-anime-tv
npm.cmd install
```

Verifica:

```powershell
npm.cmd test
npm.cmd run build
```

### Dev in browser

```powershell
npm.cmd run dev
```

Apri `http://localhost:5173`. In dev Vite monta già `/proxy` → non serve un secondo terminale per il proxy.

### Proxy per la TV (obbligatorio per AnimeSaturn e Film/Altadefinizione)

Su un terminale dedicato, col PC raggiungibile dalla TV:

```powershell
npm.cmd run proxy
```

Ascolta su `0.0.0.0:8787`. In app → Impostazioni → Proxy URL:

`http://<IP-LAN-del-PC>:8787`  
(es. `http://192.168.1.8:8787` — **mai** `127.0.0.1` / `localhost` dalla TV)

AnimeUnity prova fetch diretto (senza proxy). Mock non serve rete.

---

## 3. Collegare la TV (una tantum)

1. TV: Developer Mode aperto, **Key Server ON**, annota IP e passphrase.
2. Aggiungi device (PowerShell — forma `key=value`, evita JSON fragile):

```powershell
ares-setup-device.cmd -a lg-tv -i "host=192.168.1.13" -i "port=9922" -i "username=prisoner" -i "description=LG TV"
```

3. Scarica la chiave SSH (comando **da solo**, digita la passphrase quando richiesto):

```powershell
ares-novacom.cmd --device lg-tv --getkey
```

4. Collega la chiave e la passphrase al device:

```powershell
ares-setup-device.cmd -m lg-tv -i "privatekey=lg-tv_webos"
ares-setup-device.cmd -m lg-tv -i "passphrase=XXXXXX"
ares-setup-device.cmd -F
```

5. Ping di controllo (deve rispondere):

```powershell
ping 192.168.1.13
```

Se ping fallisce: Key Server, Wi‑Fi, Tailscale, IP cambiato.

Device di default in questo repo: nome **`lg-tv`**.

---

## 4. Deploy sulla TV

### Comando consigliato

```powershell
$env:Path = "C:\Program Files\nodejs;C:\Users\dvdch\AppData\Roaming\npm;" + $env:Path
cd c:\Users\dvdch\Desktop\Projects\webos-anime-tv
npm.cmd run deploy
```

Fa in sequenza:

1. `build` → `dist/`
2. `ares-package --no-minify` → `release\com.personal.webanimetv_0.1.0_all.ipk`  
   (`--no-minify` evita errori su chunk grandi tipo `hls.js`)
3. `ares-install` + `ares-launch` su `lg-tv`

### Solo install/launch (IPK già pronto)

```powershell
npm.cmd run install:webos
```

### Script npm

| Script | Cosa fa |
|--------|---------|
| `dev` | Vite browser |
| `build` | Typecheck + Vite + copy `appinfo`/icone |
| `proxy` | Server CORS LAN `:8787` |
| `test` | Vitest |
| `package:webos` | Build + IPK in `release/` |
| `install:webos` | Install + launch su `lg-tv` |
| `deploy` | `package:webos` + `install:webos` |

App id: `com.personal.webanimetv`.

### Problemi tipici di deploy

| Errore | Cosa fare |
|--------|-----------|
| `npm.cmd` non riconosciuto | Prefissa PATH (sezione 1); `cd` nella cartella app |
| `release\*.ipk` path does not exist | Usare il path esplicito nello script (già corretto in `package.json`) |
| `ECONNREFUSED 127.0.0.1:9922` | Host device sbagliato → re-add con IP reale |
| `Connection timed out` | Ping TV; Key Server; spegni Tailscale |
| `Failed to get ssh private key` | Key Server ON + `ares-novacom --getkey` interattivo |
| `Encrypted OpenSSH private key… no passphrase` | `ares-setup-device -m lg-tv -i "passphrase=…"` |
| `Failed to minify` su `hls-*.js` | Package con `--no-minify` (già in `package:webos`) |

---

## 5. Aggiungere un nuovo provider

Checklist pratica:

### 5.1 Cartella provider

Crea `src/providers/<id>/`:

- `<Name>Provider.ts` — implementa `ContentProvider` (`src/providers/types.ts`)
- `parser.ts` (opzionale) — HTML/JSON → modelli dominio

Metodi obbligatori:

- `getHome()` → sezioni Home
- `search(query)`
- `getAnimeDetails(animeId)` (+ episodi)
- `getEpisodes(animeId)`
- `getStreamSources(episodeId)` → `StreamSource[]` (`mp4` / `hls`)

Restituisci sempre `okResult` / `errResult` (niente throw non gestiti verso la UI).

### 5.2 Registrazione

In `src/app/bootstrap.ts`:

```ts
registry.register(new MioProvider(providerCtx, config.enableMioProvider));
```

In `src/core/config/AppConfig.ts`: flag `enableMioProvider: true/false`.

### 5.3 Proxy / host consentiti (fetch)

Se il provider passa dal proxy personale (`HttpClient.getText(url)` con `useProxy` default `true`):

1. Aggiungi hostname in `tools/cors-proxy/fetch.mjs` → `ALLOWED_HOSTS`  
   (sito, CDN immagini, embed, playlist).
2. Se serve Referer upstream: header client `X-Proxy-Referer` (già supportato dal proxy).
3. Riavvia `npm run proxy` dopo aver cambiato la allowlist.

Se il provider deve andare **diretto** (come AnimeUnity):

```ts
this.ctx.http.getText(url, {}, false); // useProxy = false
```

Su TV packaged a volte funziona; in browser desktop spesso serve comunque il proxy.

### 5.4 Sezione UI

- **Anime:** Home/Cerca usano `preferredProviderId` (Settings).
- **Film:** route `movies` / `movies-search` puntano a `altadefinizione`.  
  Per un altro catalogo “sezione a parte”: nuova route + pagina (vedi `MoviesHomePage.ts`) + eventuale CSS dedicato (`styles/movies.css`).

Details e Player sono già agnostici: naviga con `providerId` + `animeId` / `episodeId`.

### 5.5 Settings

Il toggle “Provider X” in Impostazioni abilita/disabilita tutti i provider registrati (stato in IndexedDB).  
Il ciclo “Provider preferito (Anime)” esclude i provider film (`altadefinizione`).

### 5.6 Test e docs

- Test parser in `tests/unit/<id>-parser.test.ts`
- Aggiorna [PROVIDERS.md](./PROVIDERS.md)
- `npm.cmd test` e `npm.cmd run deploy`

### 5.7 Pattern fetch consigliati

```ts
// Con cache HTML
const html = await this.ctx.http.getText(url); // via proxy se configurato
await this.ctx.cache.set({ key, kind: 'html', value: html, ttlMs: this.ctx.cacheTtlMs });

// JSON API
const data = await this.ctx.http.getJson<T>(apiUrl);

// Embed che richiede Referer
await this.ctx.http.getText(embedUrl, {
  headers: { 'X-Proxy-Referer': pageUrl },
});
```

Non fare scraping illimitato in parallelo: rispetta `httpMinIntervalMs` del client.

---

## 6. Mappa rapida file utili

| Percorso | Ruolo |
|----------|--------|
| `package.json` | Script `deploy` / `proxy` / `test` |
| `src/app/bootstrap.ts` | Register provider |
| `src/core/config/AppConfig.ts` | Flag e proxy default |
| `src/core/net/HttpClient.ts` | Fetch + proxy URL |
| `tools/cors-proxy/fetch.mjs` | Allowlist host |
| `tools/cors-proxy/server.mjs` | Server `:8787` |
| `src/ui/pages/MoviesHomePage.ts` | Sezione Film |
| `appinfo.json` | Id pacchetto webOS |
| `release/*.ipk` | Artefatto installabile |

---

## 7. Disclaimer

Uso personale/sperimentale. Non pubblicare su store, non esporre il proxy su Internet, non redistribuire. I provider accedono a siti di terze parti: responsabilità e rispetto di ToS/copyright restano tuoi.
