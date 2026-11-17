# Attività — MODULO 2 (11/11/2026)

Backlog operativo Modulo 2 (portale subvettori / contratti / documentazione).  
Oggi di riferimento: **11/11/2026**.

Cross-ref: osservazioni cliente 06/11 (`mail_cliente_osservazioni_2026-11-06.md`), sync tratte / SGA (SAL 30/09–30/10), flusso firma EasyGN.

---

## BUGFIX

| # | Tema | Note |
|---|------|------|
| B1 | Rappresentante legale non riportato su contratto in firma | In PDF/firma non compaiono i dati del rapp. legale. Verificare form review / `finalize_contract_*` / report `nuovo_contratto_vettore` (e appendici se applicabile). |
| B2 | Sincronia tratte con SGA | Allineare job sync tratte (`insert_new_trips_*`, `check_new_trips_*_basevettori`, eventuale ottimizzazione da SAL 30/10). |
| B3 | Ricerca su tutte le grid | Abilitare / sistemare search su **tutte** le grid del modulo (Scriptcase grid search / filtri). |
| B4 | Invio link automatico firma a Marcello (committente) | Dopo firma subvettore (`web_hook_firma` member done): invio automatico del link a **Marcello** (`committente_legale_*` / meta EasyGN). **Pulsante sollecito** resta su `grid_contratti` (`resend_committente_sign_link`) finché non firma. **Fatto 11/11.** |
| B5 | Grid operative in dettaglio subvettore | Schermata dettaglio subvettore: rendere operative le grid (action / link / dati) oggi non funzionanti. |
| B6 | N° contratto di riferimento nelle successive appendici | Bug già segnalato 06/11 (Prova04novembre): appendice deve citare il **quadro tipo 1**, non l’id della variazione. Vedi `mail_cliente_osservazioni_2026-11-06.md` §3. |
| B7 | Denominazione appendici = “Appendice”, non “Contratto” | Label / PDF / mail: `Appendice#N` (non `Contratto#N`). Vedi mail 06/11 §5. |
| B8 | Committente: solo notifiche firma | A Marcello (`group_id = 5`) solo notifiche per **firma** (contratto/appendici); **non** scadenze documenti né altre alert. Vedi mail 06/11 §1 (job expiry già filtrati su group 1/3). |

---

## NEW

| # | Tema | Note |
|---|------|------|
| N1 | Template contratto editabile (anche pre-invio subvettore) | Possibilità di modificare il contratto come **template** e anche **prima** di inviarlo al subvettore: testo e **posizionamenti firme**. Estende il punto “martedì” della mail 06/11 (§6) a requisito operativo. |
| N2 | Documenti a subv da visionare/firmare | Possibilità di **inviare documenti** al subvettore da visionare/firmare. Creare **nuova sottosezione** in **Documentazione**. |

---

## Checklist lavoro

| # | Tipo | Tema | Priorità |
|---|------|------|----------|
| B1 | BUGFIX | Dati rapp. legale su contratto in firma | Alta |
| B2 | BUGFIX | Sync tratte ↔ SGA | Alta |
| B3 | BUGFIX | Ricerca su tutte le grid | Media |
| B4 | BUGFIX | Link firma auto a Marcello + pulsante sollecito | Fatto (webhook 11/11) |
| B5 | BUGFIX | Grid dettaglio subvettore operative | Alta |
| B6 | BUGFIX | N° contratto di riferimento in appendici | Alta |
| B7 | BUGFIX | Label “Appendice” non “Contratto” | Alta |
| B8 | BUGFIX | Committente: solo notifiche firma | Alta |
| N1 | NEW | Template contratto (testo + firme) pre-invio | Alta |
| N2 | NEW | Sottosezione Documentazione: invio doc a subv | Alta |

---

## Vedi anche

- Mail cliente 06/11: `mail_cliente_osservazioni_2026-11-06.md`
- Call 30/10 (sync tratte, UAT): `pigliacelli_briefing_sal_2026-10-30.md`
- Tipi contratto / appendici / Marcello: `LLM_WIKI.md`
- Firma / EasyGN: `easygn_codici_errore.md`
