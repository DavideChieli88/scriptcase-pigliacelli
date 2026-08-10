# Deploy su Samsung Tizen TV

Target di riferimento: **QE65LS03BAUXZT**, Tizen **6.5**, Chromium **M85**.

## Manifesto

Il file [`config.xml`](../config.xml) dichiara:

- **package id `AnimeTVApp` (esattamente 10 caratteri alfanumerici)** — obbligatorio su TV Samsung; ID più corti danno `install failed[118, -4] Load archive info fail`
- application id `AnimeTVApp.App`
- profile `tv-samsung`
- privilege `internet`, `tv.inputdevice`
- `<access origin="*" subdomains="true"/>` (necessario per fetch cross-origin in packaged app)
- `content` → `dist/index.html` (dopo `npm run build`)
- landscape 1080p

## Build web

```bash
npm install
npm run build
```

Output: `dist/` con asset a path relativi (`base: './'`).

## Packaging `.wgt`

### Estensione VS Code / Cursor (Tizen TV / Tizen Web)

1. `npm run build`
2. Certificate Manager: profilo **Samsung** con author+distributor in `~/SamsungCertificate/SamsungTV-Dev/`, DUID della TV (`KLCLTHZVQBQAQ` sul device attuale)
3. Device Manager → device connesso → **Permit to install applications**
4. **Build Signed Package** / **Run Project**

Il file [`.buildignore`](../.buildignore) esclude `node_modules`, `.git`, `src`, ecc.

### CLI

```bash
npm run package:tizen          # solo .wgt firmato in Debug/
npm run deploy:tizen           # bump versione + package + install + launch
npm run install:tizen          # come deploy, senza bump versione
```

Richiede il profilo CLI **SamsungTV-Dev** (default) che punta ai `.p12` in `SamsungCertificate/SamsungTV-Dev/`.

### Deploy come aggiornamento

La TV è raggiungibile a **`192.168.68.68:26101`** (static). Lo script fa `sdb connect` da solo — non serve collegarla prima dall’estensione VS Code/Cursor.

```bash
npm run deploy:tizen
```

Prerequisiti sulla TV: Developer Mode attivo, Host PC IP = questo Mac, Permit to install.

Lo script:

1. Incrementa il patch di `version` in `config.xml`
2. Esegue build + packaging firmato (`SamsungTV-Dev`)
3. Connette `sdb` a `192.168.68.68:26101`
4. Installa con `tizen install` (non `sdb install`, che su TV 6.5 spesso fa solo push)
5. Lancia `AnimeTVApp.App`

Opzioni:

```bash
DEPLOY_VERSION=0.2.0 npm run deploy:tizen   # versione esatta
SKIP_BUMP=1 npm run deploy:tizen             # senza bump versione
SKIP_LAUNCH=1 npm run deploy:tizen           # solo install
TIZEN_TV_HOST=192.168.68.68 npm run deploy:tizen
SDB_SERIAL=192.168.68.68:26101 npm run deploy:tizen
```

Stesso author/distributor cert dell’installazione precedente, altrimenti Tizen rifiuta l’update.

## Errori comuni

### `install failed[118, -4] … Load archive info fail`

Quasi sempre **package id ≠ 10 caratteri** (es. `AnimeTV` = 7). Usare `AnimeTVApp`.

Verifica rapida: in `config.xml` deve esserci `package=".........."`` (10 char) e `id="{package}.App"`.

### `install failed[118, -12] … Check certificate error`

L’archivio è ok, la firma no:

1. Profilo Samsung (non solo Tizen / sdk-public)
2. DUID TV nel distributor cert (Device Manager → DUID)
3. **Permit to install applications**
4. Se l’app era già installata con un altro author cert: disinstalla e riprova

## Developer Mode sulla TV

1. Accendi la TV, apri **Apps**
2. Digita `12345` sul telecomando (o sequenza documentata per il tuo firmware) per aprire Developer Mode
3. Abilita Developer Mode, inserisci l’IP del PC
4. Riavvia quando richiesto

## Installazione

1. PC e TV sulla stessa rete
2. Device Manager → connessione IP TV
3. Installa il `.wgt` firmato
4. Avvia l’app dalla lista Apps / Developer

## Test con telecomando

Checklist minima:

- [ ] Home: freccia giù dalle CTA hero alle rails
- [ ] Left/Right sulle card, focus ring visibile (anche oltre le prime ~8 card)
- [ ] Enter apre Details
- [ ] Play episodio, Back torna a Details, Back a Home
- [ ] Search: input + risultati navigabili
- [ ] Settings: toggle con Enter
- [ ] Player: Play/Pause remoto (se presente), Back salva progresso
- [ ] Fine episodio: overlay next-episode con titolo; countdown se autoplay On; Annulla/Back ferma
- [ ] Continua a guardare appare dopo aver guardato > ~2%

## Performance pass (device)

Dopo navigazione prolungata (20+ Home↔Details, scroll rails lunghe):

- [ ] Nessun freeze evidente sullo scroll focus
- [ ] Poster lazy: fallback poi immagine, senza burst di richieste
- [ ] Memoria TV accettabile (nessun crash OOM)

## Debug desktop

`npm run dev` + tastiera. Esc = Back. Utile prima del deploy TV.

## Note CORS

- **Su TV packaged**: privilegi Tizen + access origin
- **In Vite desktop**: i provider esterni possono richiedere un proxy locale (v2 companion) — MockProvider non necessita rete per metadata
