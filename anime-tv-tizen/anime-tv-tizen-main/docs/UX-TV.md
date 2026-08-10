# UX TV guidelines

## Design targets

- Primary layout: **1920×1080**
- Readable from **2–3 meters**
- Dark cinematic theme (tokens in `src/styles/tokens.css`)
- No ads, no invasive overlays, no third-party widgets

## Focus rules

- Every interactive control has `data-focusable="true"` and `data-focus-id`
- Rows use `data-focus-row` for horizontal memory
- Focus ring: 4px white + soft glow (`focus.css`)
- Focus scale on posters: ~1.08
- **No hover-only** interaction paths

## Remote mapping

Handled by `RemoteInput` + `KeyMap`:

| User intent | Action |
|-------------|--------|
| Move | up / down / left / right |
| Select | enter |
| Long-press OK | longPress (context menu on local home rails) |
| Leave screen | back (pops router stack) |
| Media | play / pause / playPause / rewind / fastForward |

Desktop testing: Arrow keys, Enter, Escape (= Back).

## Screens

### Home
TopBar → Hero (Riprendi / Dettagli) → rails:
Continua a guardare, Ultimi visualizzati, Aggiunti di recente, Popolari.

Rails usano **virtualizzazione orizzontale**: solo una finestra di card intorno al focus resta nel DOM (spacer per la larghezza totale).

Su **Continua a guardare** e **Ultimi visualizzati**, tenere premuto OK (~700ms) apre un menu contestuale per rimuovere il singolo titolo dalla lista.

### Search
Debounced input (300ms), poster grid, empty/error states.

### Details
Cover, meta, description, watchlist toggle, episode list (paged light virtualization).

### Player
Fullscreen video, timed control overlay, progress bar, next-episode panel:
- titolo episodio successivo
- **Riproduci** / **Annulla**
- countdown 5s se autoplay attivo (alla fine episodio)
- Back sul prompt = dismiss (non esce dal player)

### Watchlist / Settings
Large rows, high contrast values, confirm modal only for destructive reset.

## Motion

- Fast transitions (~160–240ms)
- Prefer opacity/transform (compositor-friendly)
- Avoid heavy blur/shadow stacks on TV GPUs

## Empty / error / skeleton

Always provide:
- clear title
- short explanation
- actionable Retry / Back when relevant

## Accessibility TV

- Large type scale (`--text-sm` 22px+)
- Wide hit areas (min ~64px controls)
- High contrast text on dark surfaces
- Focus never “lost” — engine falls back to first node
