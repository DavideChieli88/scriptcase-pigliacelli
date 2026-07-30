# webOS packaging & deploy

## appinfo.json

Package id: `com.personal.webanimetv`

Important flags:

- `type: "web"`
- `resolution: "1920x1080"`
- `disableBackHistoryAPI: true` — Back handled by the app
- `main: "index.html"`

Icons: `icon.png` (80×80), `largeIcon.png` (≥80, typically 130×130).

## Build & package

```bash
npm install
npm run build
# dist/ contains index.html, assets, appinfo.json, icons

ares-package dist -o release
ares-install -d <TV_DEVICE> release/*.ipk
ares-launch -d <TV_DEVICE> com.personal.webanimetv
```

Debug:

```bash
ares-inspect -d <TV_DEVICE> com.personal.webanimetv
```

## CORS / proxy on device

Packaged apps do not get a useful CORS origin for third-party sites. For AnimeSaturn:

1. Run `npm run proxy` on a PC in the same LAN
2. On the TV app Settings → set Proxy URL to `http://<PC-LAN-IP>:8787`
3. Do **not** use `localhost` from the TV (it points to the TV itself)

Firewall must allow inbound TCP 8787 from the TV.

## Remote testing checklist

- [ ] Home rails navigate H/V with arrows
- [ ] Focus ring always visible; no focus loss
- [ ] Enter opens details / activates buttons
- [ ] Back: Player → Details/previous → Home; overlays first
- [ ] Continue watching resumes time
- [ ] Favorites / history persist across relaunch
- [ ] Provider failure shows banner, Mock still usable
- [ ] Play/Pause keys (if available) control player

## Compatibility checklist

- [ ] Only web APIs available on webOS Chromium
- [ ] No Node APIs in bundled app code
- [ ] H.264/AAC MP4 sample works; HLS optional/native TBD
- [ ] IndexedDB persists between launches
- [ ] 1920×1080 + overscan safe margins
- [ ] Memory: page teardown clears focus listeners/video
- [ ] Tested on real QNED / webOS device

## Do not

- Rely on hover/mouse as primary UX
- Use localStorage as primary DB
- Ship heavy frameworks without need
- Unlimited parallel fetches
- `innerHTML` with unsanitized remote HTML
- Assume CORS works without proxy
- Point proxy to `localhost` from IPK
- Publish scraper app to public stores
- Ignore system Back
