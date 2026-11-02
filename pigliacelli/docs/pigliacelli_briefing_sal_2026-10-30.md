# Briefing e SAL — 30 ottobre 2026

**Fonte:** appunti Gemini della call *Pigliacelli Workspace | Briefing e SAL* (30/10/2026, 10:21 CET)  
**Partecipanti:** Davide Chieli, Erik Capoccetta (Digiweb)  
**File originale:** `pigliacelli_briefing_sal_2026-10-30.docx` · trascrizione `pigliacelli_briefing_sal_2026-10-30.txt`

Vedi anche: [`mail_flavia_prova_2026-10-29.md`](mail_flavia_prova_2026-10-29.md) · [`pigliacelli_briefing_sal_2026-10-21.md`](pigliacelli_briefing_sal_2026-10-21.md)

Call operativa sulla mail di Flavia (29/10) e sulla sync SGA. Priorità: ripulire UAT, chiudere i punti 1–4 prima di martedì (incontro in presenza col cliente).

---

## Riepilogo call

- **Impianto iniziale vs sync continua:** l’import “una tantum” resta sui ~100 vettori filtrati come da accordo col cliente. Il pulsante **Sincronizza SGA** (anagrafica) deve invece prendere **tutti** i vettori con `INSERT_DATA_ORA` / `UPDATE_DATA_ORA` successivi all’ultimo scarico — non solo chi ha tratte.
- Dopo la rimozione del filtro viaggi, upsert ha portato ~**1400** subvettori: da azzerare le anagrafiche di test e separare job iniziale vs job sync incrementale.
- **Pulsanti** Salva / Indietro / Prossimo in basso su tutte le schermate del flusso documentale (richiesta Flavia; da fare subito, incontro martedì).
- **Scadenze precompilate e bloccate** (readonly): ricevuta ANGA 30 aprile, RENTRI 30 aprile, Albo conto terzi 31 gennaio.
- **Manuale vettore su UAT:** accessi FileZilla/VPN limitati → sviluppare **upload PDF da interfaccia** (stima ~2h+) così aggiornano il file senza entrare sul server.
- **Notifica campanella fine wizard:** ok in DEV; da **riprovare in UAT**. Destinatari = gruppi ops (admin / trasporti / ufficio vettori).
- Segnalazioni Flavia su **anteprima contratto** e **mail non ricevuta dal vettore**: in call giudicate non fondate / test con mail inesistenti; Erik risponde al cliente e approfondisce martedì.
- Sub **127** / test 29/10 e PEC: rischio invio da mail standard verso casella PEC che accetta solo PEC; criticato l’uso di PEC reale in test.
- **Sync tratte lenta:** oggi scorre troppo; snellire con filtro su campo **modificato** SGA rispetto a `sync_date` (in DEV ~1 minuto).

---

## Decisioni

| # | Decisione |
|---|-----------|
| D1 | Separare **impianto iniziale** (~100 vettori filtrati) da **sync incrementale** anagrafica su `INSERT_DATA_ORA` / `UPDATE_DATA_ORA` |
| D2 | Pulsanti flusso documentale **in basso** su tutte le schermate |
| D3 | Scadenze ANGA / RENTRI / Albo **precaricate e non modificabili** |
| D4 | Funzione **upload documenti** (manuale PDF) da UI verso server |
| D5 | Sync tratte basata sulle sole tratte **inserite/modificate** dopo ultima sync (campo modificato SGA) |
| D6 | Punti 5–6 mail Flavia (Doc/Tratte PGL, preview+invio contratto): risposta “si vede martedì in presenza” |
| D7 | Test notifiche wizard anche su **UAT**; mail ops ok, campanella da confermare |

---

## Action items

| Chi | Cosa | Quando |
|-----|------|--------|
| Davide | Verificare punti **3–4** mail Flavia su UAT (scadenze readonly + Manuale) e comunicare esito a Erik | entro pranzo 30/10 |
| Davide | Implementare punti **1–2** (pulsanti in basso; scadenze precompilate/bloccate) | per retest UAT lunedì |
| Davide | Filtro sync anagrafica su insert/update data ora; azzerare anagrafiche test; test con dati fittizi | ASAP |
| Davide | Ottimizzare query sync tratte (campo modificato) | aggiornamenti a Erik entro pranzo |
| Davide | Test notifiche sistema in UAT | ASAP |
| Erik | Risposta mail cliente in base a esito punti 3–4 | entro pranzo 30/10 |
| Erik | Gestione risposta punti **5–6** → si affronta martedì in presenza | |
| Gruppo | Sessioni di test approfondite in vista incontro cliente martedì | |

---

## Impatto tecnico (repo)

- `insert_new_subvectors_basevettori` (**T0**): `ATTIVO='S'` + EXISTS viaggio `ANNO>=2024` + blacklist; a fine run setta `sec_settings.sync_date_subvettori`.
- `upsert_subvectors_basevettori` (**sync**): `ATTIVO` + blacklist + `INSERT_DATA_ORA`/`UPDATE_DATA_ORA` > `sync_date_subvettori` (niente filtro viaggi); avanza `sync_date_subvettori`. Richiede T0 già eseguito.
- Wizard UI: toolbar in basso; scadenze ANGA/RENTRI/Albo readonly.
- Manuale: path `_lib/file/doc` + upload UI (nuovo).
- Notifica: `grid_documenti_to_sign_wizard_btn_invia_attivazione` (fix `function_exists` / `from`) — da deployare e verificare log `WIZARD_ATTIVAZIONE` in UAT.
- `check_new_trips_*`: ridurre carico usando finestra su date modifica viaggio/tratta SGA, non scan completo ANNO>=2024 a ogni run se già syncato.

---

## Note Gemini da tenere d’occhio

- Negli appunti «AT» / «rentry» = UAT / **RENTRI**.
- «impianto iniziale» ≠ pulsante sync quotidiano.
- Segnalazioni preview/mail contratto: non trattarle come bug confermati senza riesecuzione controllata martedì.
