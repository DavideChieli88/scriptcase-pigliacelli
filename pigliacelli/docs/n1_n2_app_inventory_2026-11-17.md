# N1 / N2 — Inventory app ScriptCase (call 17/11/2026)

Scope: **N2** documenti PGL→subv (visione|firma) · **N1** template contratto HTML (tipo 1).  
Migration: [`../migration_n1_n2_call_2026_11_17.sql`](../migration_n1_n2_call_2026_11_17.sql)  
Briefing: [`pigliacelli_briefing_sal_2026-11-17.md`](pigliacelli_briefing_sal_2026-11-17.md)

**Ordine build previsto:** migration UAT → N2 (+ blank firme) → N1.  
**Riquadri firma:** Collab è solo **esempio UX** (non codice da importare). Demo vista 18/11 su `…/folders/signset/…` (**Configurazione firme**). Implementiamo noi `blank_posiziona_firme_pdf`.

### UX Collab da replicare (PoC)

1. PDF a pagine (canvas/dropzone) + etichetta `PAGINA N DI M`
2. Chip firmatari in alto: *“clicca sul nome del firmatario per posizionarlo”*
3. Click sul nome → box `.sign-area` sulla pagina corrente (drag + resize; X per eliminare)
4. Chip passa a stato “posizionato”; **Salva** persiste coordinate (x,y,w,h,page) → da noi in `sign_boxes_json` (schema EGN_SIGN / mm)

---

## Sintesi

| Azione | Quante | Note |
|--------|--------|------|
| **Nuove app** | 6 | CRUD PGL, inbox subv, posiziona firme, template, edit snapshot |
| **Modificare** | ~12 | menu, grid/form documenti esistenti, EasyGN docs, finalize/report tipo 1 |
| **Riuso senza rewrite** | — | EasyGN core, `presa_visione_at`, finalize poll, allegati A/B |

---

## NUOVE app

| App (nome proposto) | Tipo SC | Feature | Perché nuova |
|---------------------|---------|---------|--------------|
| `grid_documenti_pgl` | Grid | N2 ops | Lista invii PGL (origine=pgl); non mescolare con upload subv |
| `form_documenti_pgl` | Form | N2 ops | Upload PDF, titolo, subvettore, modalita visione\|firma, invio |
| `grid_documenti_ricevuti` | Grid | N2 subv | Inbox Documentazione: doc ricevuti da PGL (post-onboarding) |
| `blank_posiziona_firme_pdf` | Blank | N2+N1 | **Creato** in repo + [`blank_posiziona_firme_pdf_SETUP.md`](blank_posiziona_firme_pdf_SETUP.md) — da pubblicare in SC |
| `grid_contratti_template` | Grid | N1 | Setup: [`form_contratti_template_SETUP.md`](form_contratti_template_SETUP.md) · mig [`../migration_n1_contratti_template_min.sql`](../migration_n1_contratti_template_min.sql) |
| `form_contratti_template` | Form | N1 | onValidate/onLoad in repo; campo `html_body` = HTML Editor SC |
| `form_contratto_html_preinvio` *(opz. nome)* | Form / Control | N1 | Edit snapshot HTML del singolo contratto pre-invio |

> Se `form_contratto_html_preinvio` si riesce a fare come step interno al flusso invio esistente (senza form dedicata), si può evitare la settima app — da decidere in build.

---

## MODIFICARE — N2 Documentazione

| App | Modifica |
|-----|----------|
| `app_menu` / menu Documentazione | Split **2 sottosezioni**: (A) caricati dal subv · (B) inviati da PGL / ricevuti |
| `grid_documenti` | Filtro/SQL `origine='subv'` (o equivalente) così non mescola invii PGL |
| `grid_documenti_by_subvettore_id` | Stesso criterio origine se usata in dettaglio subv |
| `form_documenti` | Forzare `{modalita}='upload'` in onBeforeInsert/Update (vedi file repo); non esporre campi N2 ops |
| `grid_documenti_to_sign_wizard` | Resta **solo onboarding** (verdi); non usarla come inbox N2 |
| `grid_documenti_to_sign_wizard_btn_apri` | Pattern presa visione → riusare logica su inbox N2 |
| `easygn_start_wf_docs` | Leggere `documenti.sign_boxes_json` (mm) invece di box fissi page-1 |
| `generate_doc_to_sign` | Solo se il path firma N2 passa da qui; altrimenti lasciare ai verdi |

---

## MODIFICARE — N1 Contratto tipo 1

| App | Modifica |
|-----|----------|
| `nuovo_contratto_vettore` | Body da `html_body_snapshot` / template + `writeHTML`; metadata `EGN_SIGN` da `contratti.sign_boxes_json` |
| `finalize_contract_subvector_v2` | Hook: dopo edit/firme, stessa orchestrazione `contratti.file` / iframe |
| `easygn_start_wf` / `easygn_start_wf_auto` | Preferire visuals da JSON salvato se presente (oltre parse Subject PDF) |
| `control_nuovo_contratto_quadro` *(e varianti)* | Flusso creazione: scegli template → snapshot → (edit) → posiziona firme → invio |
| `grid_contratti` / bottoni invio | Entry point verso pre-invio + posiziona firme |
| `variazione_contratto` | **Non** HTML editor (tipo 2/3 fuori scope N1) |

---

## MENU / ACL

| Dove | Cosa |
|------|------|
| Menu operatori | Sottosezione Documentazione PGL + voce **Template** (N1) |
| Menu subvettore | Inbox “Documenti ricevuti” (visione/firma) |
| Gruppi | Ops: upload/invio PGL + template; Subv group 2: solo inbox ricevuti |
| B9 Flavia (parallelo) | Permessi firma committente — non bloccante N1/N2 ma nel backlog |

---

## Riuso (non nuove app)

| Pezzo | Dove |
|-------|------|
| `EGN_SIGN` / parse visuals | `nuovo_contratto_vettore`, `easygn_start_wf*.php` |
| Presa visione | `presa_visione_at` + btn_apri Manuale |
| Firma doc EasyGN | `easygn_start_wf_docs` |
| Finalize / poll PDF | `finalize_contract_subvector_v2` |
| Allegati A/B | Procedurali fuori dal template editabile (fase 1) |

---

## Dipendenze / ordine

```text
1. SHOW COLUMNS UAT → applicare migration_n1_n2_call_2026_11_17.sql
2. Demo UX riquadri in browser → blank_posiziona_firme_pdf (PoC nostro)  ← N2+N1
3. form/grid_documenti_pgl + menu split + inbox subv  ← N2
4. easygn_start_wf_docs legge sign_boxes_json
5. grid/form_contratti_template + snapshot pre-invio  ← N1
6. nuovo_contratto_vettore / finalize usano snapshot + box
```

---

## Fuori scope (call 17/11)

- Template HTML per privacy / 231 / altri doc aziendali  
- Editor full-text su appendici tipo 2/3  
- Eliminare doppio invio (decisione: **mantenere**)  
