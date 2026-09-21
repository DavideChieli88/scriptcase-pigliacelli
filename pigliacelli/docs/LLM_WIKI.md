# Pigliacelli — LLM Wiki

Wiki operativa per agenti/LLM. Aggiornare quando cambiano requisiti o naming.

**Gerarchia requisiti (prevale dall’alto):**
1. `chiarimento_anga_rentri_2026-09-17.md`
2. `pigliacelli_briefing_sal_2026-09-16.md`
3. `pigliacelli_briefing_sal_2026-07-21.md`
4. `requisiti_pigliacelli_validazione_2026-07.md`
5. `docs_elenco_documenti_subvettori.md` · `modello_flag_documenti.md`

---

## Cos’è il repo

- Path: `pigliacelli/` (altri folder root = progetti non correlati).
- **Non** è un’app PHP stand-alone: snippet da incollare in **Scriptcase** (eventi form/grid, blank `onExecute`, report PDF, SQL).
- Stack: Scriptcase + MySQL `pigliacelli` + PDO SQL Server **SGA** + **EasyGN** + SMTP.
- Config runtime: `sec_settings`. Utenti subvettore: `sec_users` **group 2** (operatori 1/3).

**Ignorare:** `old_files/`, `docs/_tmp*`, stub `get_invoices` root (0 byte). Produzione = varianti `*_basevettori` (+ `_v2` / `_credenziali`).

---

## Dominio

Portale **sub-vettori** (trasporto):

| Area | Cosa |
|------|------|
| FASE 1 onboarding | Wizard: anagrafica → autisti → mezzi → upload doc → firma “verdi” EasyGN → invio attivazione |
| Contratti SGA | Job tratte → tipo **1** Quadro+All.A, **2** appendice nuove tratte, **3** variazione tariffe |
| Revisione+firma | Magic link PEC → form → PDF → EasyGN duale → `web_hook_firma` |
| Documenti | Tipi, possesso/readonly, alert scadenze; ANGA/RENTRI sui **mezzi** |
| Modulo 1 | Fatture Zucchetti, DDT webhook, sync società/fornitori/ordini |

Tabelle chiave: `subvettori`, `contratti`, `subvettori_contratti`, `tratte`, `contratti_tratte`, `documenti`, `tipi_documento`, `subvettori_autisti`, `subvettori_mezzi`, `sec_users`.

---

## Naming file → Scriptcase

| Pattern | Significato |
|---------|-------------|
| `form_<entità>_on<Evento>` | Evento form (`onLoad`, `onValidate`, `onAfterInsert`, …) |
| `form_*_wizard_*` | Step onboarding |
| `grid_*_onRecord` / `_btn_*` | Grid riga / Action Ajax |
| `blank_*` o job senza prefisso | Blank **`onExecute`** |
| `*_basevettori` / `_v2` / `_credenziali` | T2BaseVettori; allegato A arricchito; mail credenziali |
| `web_hook_*` / `webhook_simulate_*` | Callback reali vs UAT |
| `migration_*.sql` | DDL/DML |

---

## Catalogo rapido per dominio

**Sync SGA:** `upsert_subvectors_basevettori`, `insert_new_trips_*`, `check_new_trips_nuovo_contratto_basevettori[_v2|_credenziali]`, `sync_subvettori_pec_da_sga`, `backfill_tratte_allegato_basevettori`

**PDF/firma:** `nuovo_contratto_vettore`, `variazione_contratto`, `finalize_contract_subvector`, `easygn_start_wf[.php|_auto|_docs]`, `web_hook_firma`, `start_contract_sign_after_review`

**Auth:** `send_magic_link[_credenziali]`, `send_credenziali_subvettori_batch`, `form_subvettori_contratti_magic_link_review_*`, `app_menu_onLoad`

**Wizard:** `blank_wizard_landing`, `form_subvettori_starting_wizard_*`, `*_autisti_wizard_*`, `form_subvettori_mezzi_*`, `form_documenti_wizard_*`, `grid_documenti_to_sign_wizard_*`, `generate_doc_to_sign`, `dichiarazioni_pdf`

**Documenti:** `form_documenti_on*`, `docs_multi_select`, `send_doc_expiry_alerts`, `download_documento`

**Modulo 1:** `modulo_1/get_invoices*`, `web_hook_ddt`, `upsert_societa_and_fornitori`, `upsert_ordini_sga`

---

## Flussi principali

### Contratto SGA → firma
```
check_new_trips_*_basevettori → contratti tipo 1/2/3
  → send_magic_link[_credenziali] (PEC)
  → form magic_link_review → Compilato
  → finalize / start_contract_sign_after_review
  → PDF + easygn_start_wf → web_hook_firma → Completato
```
Stati tipici: Da inviare → Inviato → Compilato → Attesa firma sub → Attesa firma committente → Completato | Rifiutato.

### Onboarding FASE 1
```
credenziali → login group 2, wizard_complete=0
  → wizard 1–5 → EasyGN doc verdi → Invio attivazione → wizard_complete=1
```

### Documenti flag (`modello_flag_documenti.md`)
- `tipi_documento`: `is_readonly`, `flag_possesso`, `tipo_collegato_id` (no `tipo_padre_id`)
- `documenti` (previsti): `in_possesso`, `presa_visione_at`, `documento_padre_id`
- UI: `is_readonly=0` caricare / `=1` visionare

### ANGA/RENTRI (mail 17/09 — per **mezzo**)
- Cat. 1/4/5 = Autorizzazione ANGA (1 auth+scadenza per cat. flaggata)
- Ricevuta ANGA: slot per cat.; scad. **30/04**
- Iscrizione RENTRI: **unica**, **senza** scadenza
- Ricevuta RENTRI: **unica**, scad. **30/04**
- Non moltiplicare RENTRI per categoria; non confondere quietanza con ricevuta pagamento

---

## Decisioni SAL 16/09 (P0/P1)

- ANGA/cat./carta circolazione su **mezzo**, non autista
- Tipo veicolo: select **Trattore | Semirimorchio** (un record = una targa)
- Autista↔mezzo **facoltativa**
- Scadenza obbligatoria al caricamento doc autisti
- Allegato F: flusso **annuale** + storico (P2)
- Presa visione: log data/ora (no timestamp a pagamento)
- PDF 231/etico/manuale/privacy: placeholder fino a ott–nov cliente
- Credenziali: invio su azione operatore (non auto all’import SGA), salvo job batch dove previsto

---

## Scriptcase — regole di lavoro

Rif. ufficiali: [Events](https://www.scriptcase.net/docs/en_us/v9/manual/06-applications/10-menu-application/06-menu-events/01-general-overview/), [Blank onExecute](https://www.scriptcase.net/docs/en_us/v9/manual/06-applications/09-blank-application/01-blank-on-execute/), [Macros](https://www.scriptcase.net/docs/en_us/v9/manual/14-macros/02-macros/), [Variables](https://www.scriptcase.net/docs/en_us/v9/manual/03-knowing-scriptcase/09-scriptcase-variables/).

- Form lifecycle: `onApplicationInit` → `onScriptInit` → `onLoad` → `onValidate` → `onBefore/AfterInsert|Update|Delete`
- Blank: solo `onExecute` (job/webhook)
- Globali: `[nome]` (Session/GET/POST). Campi: `{campo}`
- Wizard: identificativo subvettore = **solo** globale `[subvettoreId]` (fallback: `sec_users.subvettore_id` da `[usr_login]`). **Non** usare `$_SESSION['wizard_subvettore_id']`
- Macro tipiche: `sc_lookup`, `sc_exec_sql`, `sc_redir`, `sc_error_message`, `sc_ajax_*`
- Non usare `[ ]` come identifier SQL (conflitto con globali) → preferire `"`
- Modifiche: editare lo snippet in repo; indicare **app + evento** Scriptcase di destinazione
- Non reinventare da `old_files` se esiste variante `*_basevettori`

---

## Troubleshooting UI

| Sintomo | Causa | Fix |
|---------|-------|-----|
| 2× **Chiudi** in modale wizard | Exit SC nativo duplicato (`#sc_b_sai_t`) | Togliere Exit; pulsante **JavaScript** `btn_chiudi_modale` con body `wizChiudiModale();` + JS method `wizard_btn_chiudi_modale.js`. onLoad: exit/sair/back OFF, btn ON solo in modale. `sc_exit` / `scBtnFn_sys_format_sai` non usabili qui |
| Campi ANGA visibili in modale mezzi con tutti i `has_cat=0` | `onLoad` assegnava `{anga_cat_*}` / `{ricevuta_anga_*}` **dopo** `sc_field_display('off')` → SC riaccende il Document | Preload ANGA/RENTRI solo se flag=1; `sc_field_display` in fondo all'onLoad. Radio: Reload ON. |
| Grid verdi non si aggiorna dopo firma EasyGN | Timeout sul click Ajax muoiono (SC rerenderizza la grid) | `easygn_start_wf_docs` (stessa origine, opener vivo) fa `opener.setTimeout(location.reload)` poi va su EasyGN. `onRecord` legge `firmato_il` da DB |

## Come aggiornare questa wiki

Quando chiudi un task rilevante: aggiorna la sezione interessata + data in coda. Non duplicare interi briefing: linka il file fonte.

*Ultimo aggiornamento: 2026-09-21*
