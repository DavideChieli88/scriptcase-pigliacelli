# Attività — MODULO 2 (11/11/2026, aggiornato 17/11)

Backlog operativo Modulo 2 (portale subvettori / contratti / documentazione).  
Riferimenti: **11/11/2026** (backlog iniziale) · **17/11/2026** (call SAL — scope NEW e stati).

Cross-ref: `mail_cliente_osservazioni_2026-11-06.md`, `pigliacelli_briefing_sal_2026-11-17.md`, sync tratte / SGA, EasyGN.

**Target NEW (N1+N2):** metà dicembre 2026 (≈17–21/12).

---

## BUGFIX

| # | Tema | Note | Stato 17/11 |
|---|------|------|-------------|
| B1 | Rappresentante legale non riportato su contratto in firma | PDF/firma / review / `finalize_contract_*` / `nuovo_contratto_vettore`. | Aperto (non trattato in call) |
| B2 | Sincronia tratte con SGA | `check_new_trips_fast` + lock UI/DB. | **Fatto** |
| B3 | Ricerca su tutte le grid | QA rapida + filtri avanzati; case-insensitive (Documentazione); togliere Id superfluo; operatori coerenti col tipo. | **In corso** |
| B4 | Invio link automatico firma a Marcello + sollecito | `web_hook_firma` + `resend_committente_sign_link`. | **Fatto** |
| B5 | Grid operative in dettaglio subvettore | Stesse funzioni delle grid principali. | **Fatto** (dichiarato in call) |
| B6 | N° contratto di riferimento nelle appendici | Appendice cita quadro tipo 1 (`#Q`), non id variazione. | **Fatto** |
| B7 | Denominazione appendici = “Appendice” | `Appendice #N al contratto #Q` in mail/PDF/testo. | **Fatto** |
| B8 | Committente: solo notifiche firma | `group_id = 5` fuori scadenze doc. | **Fatto** |
| B9 | Firma Flavia (oltre Marcello) | Permessi ruolo committente a Flavia (1+C o group 5); nominativo legale da ADB. | **Da fare** (ACL) |
| B10 | Doppio invio | Mail 06/11 chiedeva di eliminarlo → call 17/11: **mantenere**. Appendici firma diretta: ok lasciarle. | **Decisione: tenere doppio invio** |

---

## NEW

| # | Tema | Note | Stato 17/11 |
|---|------|------|-------------|
| N1 | Template contratto HTML editabile (+ pre-invio) | Sezione Template; HTML Editor SC; placeholder `{{campo}}`; edit per singolo invio senza toccare master; anteprima; **posiziona firme ogni volta**; scope solo contratto (non privacy/231). Impatto su report tipo 1. | **Da fare** (PoC + consegna metà dic) |
| N2 | Documenti PGL → subv (visione / firma) | Due sottosezioni Documentazione: (A) caricati dal subv; (B) inviati da PGL. Flag presa visione \| firma; se firma → upload PDF + UI riquadri (stile Collab). | **Da fare** (metà dic) |

---

## Checklist lavoro

| # | Tipo | Tema | Priorità | Stato |
|---|------|------|----------|-------|
| B2 | BUGFIX | Sync tratte ↔ SGA | — | Fatto |
| B4 | BUGFIX | Link firma auto + sollecito Marcello | — | Fatto |
| B5 | BUGFIX | Grid dettaglio subvettore | — | Fatto |
| B6 | BUGFIX | N° contratto in appendici | — | Fatto |
| B7 | BUGFIX | Label Appendice | — | Fatto |
| B8 | BUGFIX | Committente solo firme | — | Fatto |
| B10 | BUGFIX/DEC | Mantenere doppio invio | — | Decisione 17/11 |
| B3 | BUGFIX | QA ricerca/filtri/case/Id | Alta | In corso |
| B9 | BUGFIX | Permessi firma Flavia | Alta | Da fare |
| B1 | BUGFIX | Rapp. legale in firma | Alta | Aperto |
| N2 | NEW | Doc PGL visione/firma + box | Alta | Da fare (≤ metà dic) |
| N1 | NEW | Template HTML contratto + firme | Alta | Da fare (≤ metà dic) |

---

## Vedi anche

- Call 17/11: `pigliacelli_briefing_sal_2026-11-17.md` (+ `.docx` / `.txt`)
- N1/N2 inventory app + migration: `n1_n2_app_inventory_2026-11-17.md` · `../migration_n1_n2_call_2026_11_17.sql`
- N1 step template HTML: `form_contratti_template_SETUP.md` · `../migration_n1_contratti_template_min.sql`
- Mail cliente 06/11: `mail_cliente_osservazioni_2026-11-06.md`
- Call 30/10: `pigliacelli_briefing_sal_2026-10-30.md`
- Tipi contratto / appendici / Marcello: `LLM_WIKI.md`
- Firma / EasyGN: `easygn_codici_errore.md`
