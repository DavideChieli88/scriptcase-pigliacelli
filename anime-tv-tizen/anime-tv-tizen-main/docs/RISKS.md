# Risk register

| ID | Rischio | Impatto | Probabilità | Mitigazione |
|----|---------|---------|-------------|-------------|
| R1 | Parser siti terzi si rompono | Alto | Alta | Adapter isolati, feature flag OFF, MockProvider sempre disponibile, DTO validation |
| R1b | Abilitare adapter sperimentali senza parser | Medio | Media | Shell `ext-alpha`/`ext-beta` restano `enabled=false`; parser stub → errore tipizzato `disabled` |
| R2 | CORS / mixed content in sviluppo | Alto | Media | Proxy Vite / companion locale in v2; privilegi Tizen on-device |
| R3 | Memoria TV / leak immagini | Alto | Media | Lazy load, fallback poster, unload player, limiti cache |
| R4 | Focus trap / Back errato | Alto | Media | Stack router + FocusMemory + test KeyMap |
| R5 | HLS non affidabile su M85 | Medio | Media | Preferire MP4; HLS rimandato a v2 |
| R6 | Violazioni legali (copyright / ToS) | Alto | Dipende dall’uso | Core generico; adapter opt-in; disclaimer README; uso personale lecito |
| R7 | Performance Chromium M85 | Medio | Media | Bundle lean, no React, virtualizzazione leggera liste lunghe |
| R8 | Quota IndexedDB | Basso | Bassa | Eviction cache LRU/TTL; non salvare video blob |
| R9 | Rate limiting / ban IP provider | Medio | Media | minInterval HttpClient, retry limitato, backoff in providerState |
| R10 | innerHTML XSS da HTML parsato | Alto | Bassa | `textContent` / `stripHtml`; vietato innerHTML non sicuro |

## Operational notes

- Abilitare **debug mode** nelle impostazioni per log parser/rete.
- Dopo failure provider: Retry UI + eventuale cambio provider.
- Reset dati app disponibile in Impostazioni (distruttivo, con conferma).
