# Setup — `blank_posiziona_firme_pdf`

Editor riquadri firma su PDF (N2 + N1). Codice: [`../blank_posiziona_firme_pdf`](../blank_posiziona_firme_pdf).

## Prerequisiti

1. Applicare (dopo `SHOW COLUMNS`) [`../migration_n1_n2_call_2026_11_17.sql`](../migration_n1_n2_call_2026_11_17.sql) — colonna `sign_boxes_json` su `documenti` / `contratti`.
2. Record con **file PDF** già caricato (`documenti.file` o `contratti.file`).

## Creare l’app in ScriptCase

1. **New Application → Blank** → nome `blank_posiziona_firme_pdf`
2. Connessione **pigliacelli**, stesso security group degli operatori (**Use Security** = Yes)
3. Evento **onExecute**: incollare l’intero file `blank_posiziona_firme_pdf`
4. **Application → Global variables**: IN `documentoId`, `contrattoId`, e opz. `return_app`.  
   **Elimina** se presenti: `target`, `target_id`, `targetId`, `usr_login` (IN vuoto = logout fantasma).
5. Genera / deploy

### Se in Execute vedi ancora `usr_login` nel form

Togli la variabile IN `usr_login` dall’app, ripubblica, e rilancia.  
Oppure compila `usr_login` con la tua mail di login (non lasciarla vuota).

CDN usate (serve rete in UAT): PDF.js 3.11 + interact.js 1.10.

## URL / parametri

| Param | Valori | Note |
|-------|--------|------|
| `documentoId` | int | documenti |
| `contrattoId` | int | contratti (se valorizzato e documentoId vuoto → target contratti) |
| `return_app` | nome app SC | destinazione **Esci** |
| `mode` | `ui` \| `pdf` \| `save` | interni |

Esempi:

```text
blank_posiziona_firme_pdf/?documentoId=123&return_app=grid_documenti_pgl
blank_posiziona_firme_pdf/?contrattoId=45&return_app=grid_contratti
```

Da un bottone grid (PHP):

```php
sc_commit_trans();
sc_redir('blank_posiziona_firme_pdf', documentoId={id}; return_app="grid_documenti_pgl");
```

Su blank: globali IN `documentoId`, `contrattoId`, e opz. `return_app` (per Esci).
```

## Comportamento

1. Carica PDF (`mode=pdf` sullo stesso blank)
2. Chip firmatari → click → box sulla pagina visibile (drag / resize / elimina)
3. **Salva** → `POST mode=save` → `UPDATE … SET sign_boxes_json = …`
4. Coordinate in **mm** (origine top-left pagina A4), schema:

```json
{
  "version": 1,
  "visuals": {
    "vettore": [{ "page": 1, "x": 15, "y": 20, "w": 45, "h": 14 }],
    "committente": []
  }
}
```

Allineato a `EGN_SIGN` / `easygn_start_wf*` (`h` minimo ~13.1 mm = 37 pt API).

## Firmatari

- `target=documenti` → solo chip **Subvettore** (`vettore`)
- `target=contratti` → **Vettore** + **Committente**

## Collegamenti successivi

- N2: bottone da `form_documenti_pgl` / `grid_documenti_pgl` se `modalita=firma`
- N1: dopo edit HTML / generazione PDF, prima di EasyGN
- `easygn_start_wf_docs` / `easygn_start_wf`: leggere `sign_boxes_json` (todo build)
